import { Request, Response } from 'express'
import { ICreateBug } from '../interfaces/Bugs'
import { CreateBugSchemaValidator } from '../utils/validator'
import { logger } from '../shared/logger'
import GetHttpRequest from '../utils/HttpRequest'
import ProductService from './product.service'
import UserService from './user.service'
import ComponentService from './component.service'
// import axios from 'axios'

const productService = new ProductService()
const userService = new UserService()
const componentService = new ComponentService()

class BugzillaBugService {
  constructor() {
    this.createBug = this.createBug.bind(this)
    this.updateBug = this.updateBug.bind(this)
  }

  key = process.env.BUGZILLA_API_KEY || 'HOP2yNHnp4NURqPuVGxGdBeWdxFP9rVsRRv8qJQR'
  async addAttachments({ bugId, data }: { bugId: string; data: string }) {
    const attachmentRequest = new GetHttpRequest({
      url: `/rest/bug/${bugId}/attachment`,
      method: 'post',
      headers: { 'X-BUGZILLA-API-KEY': this.key },
      data: {
        ids: bugId,
        content_type: 'text/plain',
        data: data,
        file_name: `Attachment for bugId-${bugId}`,
        summary: 'bug attachments',
        is_patch: true,
      },
    })

    const attachmentResponse = await attachmentRequest.send()

    return attachmentResponse
  }

  async createBug(req: Request, res: Response) {
    let isProductExist: boolean = false

    const data: ICreateBug = {
      product: req.body.product,
      summary: req.body.summary,
      alias: req.body.alias,
      bpp_id: req.body.bpp_id,
      bpp_name: req.body.bpp_name,
      attachments: req.body.attachments,
      action: req.body.action,
    }

    try {
      const error = CreateBugSchemaValidator(data)

      if (error) return res.status(500).json({ error: true, message: error.message })

      const userResponse = await userService.getUser({
        userId: data.bpp_name
          .substring('https://'.length, data.bpp_name.length - '/protocol/v1'.length)
          .trim()
          .toLowerCase(),
      })

      if (!userResponse?.data?.users?.[0] || userResponse === undefined) {
        await userService.createUser({
          email: `${data.bpp_name
            .substring('https://'.length, data.bpp_name.length - '/protocol/v1'.length)
            .trim()
            .toLowerCase()
            .replace(/\s/g, '')}@example.com`,
          full_name: `${data.bpp_name
            .substring('https://'.length, data.bpp_name.length - '/protocol/v1'.length)
            .trim()
            .toLowerCase()
            .replace(/\s/g, '')}@example.com`,
          login: data.bpp_name
            .substring('https://'.length, data.bpp_name.length - '/protocol/v1'.length)
            .trim()
            .toLowerCase(),
        })
      }

      const productResponse = await productService.getProduct({
        productId: `${data.product.toLowerCase().replace(/\s/g, '')}`,
      })

      if (productResponse?.data?.products?.[0]?.id) {
        isProductExist = true
      }

      if (!isProductExist) {
        await productService.registerProduct({
          name: data.product.replace(/\s/g, '').toLowerCase(),
          description: data.summary,
          is_open: true,
          has_unconfirmed: true,
          version: 'Unspecified',
        })

        await componentService.createComponent({
          default_assignee: data.bpp_name
            .substring('https://'.length, data.bpp_name.length - '/protocol/v1'.length)
            .trim()
            .toLowerCase(),
          description: 'Contact details',
          name: 'Component',
          product: data.product.replace(/\s/g, '').toLowerCase(),
          is_open: 1,
        })
      }

      const complaint_actions_merged = [...data?.action?.complainant_actions, ...data?.action?.respondent_actions]

      const sortedDataByDate = this.sortByDate(complaint_actions_merged)

      const createBug = new GetHttpRequest({
        url: '/rest/bug',
        method: 'post',
        headers: { 'X-BUGZILLA-API-KEY': process.env.BUGZILLA_API_KEY },
        data: {
          product: data.product.toLowerCase().replace(/\s/g, ''),
          summary: data.summary,
          component: 'Component',
          version: 'unspecified',
          op_sys: 'ALL',
          rep_platform: 'ALL',
          alias: data.alias,
        },
      })

      const response: any = await createBug.send()

      if (data?.attachments && data?.attachments?.length !== 0) {
        await this.addAttachments({
          bugId: response?.data?.id,
          data: data?.attachments[0],
        })
      }

      if (response.data) {
        for (const item of sortedDataByDate) {
          const comment = this.generateTheCommentFromObject(item)

          await this.addComments({ bugId: response.data.id, data: comment })
        }
      }

      return res.status(201).json({ success: true, data: response?.data, alias: data.alias })
    } catch (error: any) {
      logger.error(error)
      return res.status(500).json({ error: true, message: error || 'Something went wrong' })
    }
  }

  sortByDate(array: any) {
    return array.sort((a: any, b: any) => {
      const dateA: any = new Date(a.updated_at)
      const dateB: any = new Date(b.updated_at)
      return dateA - dateB
    })
  }

  async addComments({ bugId, data }: { bugId: string; data: any }) {
    const getAttachment = new GetHttpRequest({
      url: `/rest/bug/${bugId}/comment`,
      method: 'post',
      data: {
        comment: data,
      },
      headers: { 'X-BUGZILLA-API-KEY': this.key },
    })

    const getAttachmentResponse = await getAttachment.send()

    return getAttachmentResponse?.data
  }
  async getAttachment({ bugId }: { bugId: string }) {
    const getAttachment = new GetHttpRequest({
      url: `/rest/bug/${bugId}/attachment`,
      method: 'get',
      headers: { 'X-BUGZILLA-API-KEY': this.key },
    })

    const getAttachmentResponse = await getAttachment.send()

    return getAttachmentResponse?.data
  }

  async getBug(req: Request, res: Response) {
    try {
      const getInstance = new GetHttpRequest({
        url: `/rest/bug?id=${req.params.id}`,
        method: 'get',
        headers: { 'X-BUGZILLA-API-KEY': this.key },
      })

      const response = await getInstance.send()
      const getAttachmentsResponse = await this.getAttachment({ bugId: req.params.id })

      return res.status(200).json({ success: true, bug: response?.data, attachments: getAttachmentsResponse })
    } catch (error: any) {
      logger.error(error)
      return res.status(500).json({ error: true, message: error?.message || 'Something went wrong' })
    }
  }

  async updateBug(req: Request, res: Response) {
    const complaint_actions_merged = [...req.body.action.complainant_actions, ...req.body.action.respondent_actions]

    const latestIssueAction = complaint_actions_merged.reduce((last, current) => {
      if (current.updated_at > last.updated_at) {
        return current
      }
      return last
    })

    try {
      const latestCommit = this.generateTheCommentFromObject(latestIssueAction)

      const getInstance = new GetHttpRequest({
        url: `/rest/bug/${req.params.id}`,
        method: 'put',
        data: this.getStatus(req.body.status, latestCommit),
        headers: { 'X-BUGZILLA-API-KEY': this.key },
      })

      const response = await getInstance.send()

      return res.status(200).json({ success: true, data: response?.data })
    } catch (error: any) {
      logger.error(error)
      return res.status(500).json({ error: true, message: error?.message || 'Something went wrong' })
    }
  }

  getStatus(status: string, comments: string) {
    switch (status) {
      case 'RESOLVED':
        return {
          status: 'RESOLVED',
          resolution: 'FIXED',
          comment: {
            body: comments,
          },
        }
      default:
        return {
          status: status,
          comment: {
            body: comments,
          },
        }
    }
  }

  generateTheCommentFromObject(item: any) {
    const keys = Object.keys(item)

    const itemCase = keys.some((value) => value === 'complainant_action') ? 'complainant_action' : 'respondent_action'

    switch (itemCase) {
      case 'complainant_action':
        return `\nAction Taken: ${item.complainant_action}\nAction Comment:  ${item.short_desc}\nAction Taken By: Complainant\nAction Taken At:  ${item.updated_at}`
      case 'respondent_action':
        return `Action Taken: ${item.respondent_action}\nAction Comment:  ${item.short_desc}\nAction Taken By: Respondent\nAction Taken At:  ${item.updated_at}`
      default:
        return ''
    }
  }
}

export default BugzillaBugService
