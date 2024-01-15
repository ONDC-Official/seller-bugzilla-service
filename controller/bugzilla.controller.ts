import { Response, Request } from 'express'
import MainService from '../services/main.service'

const BugService = new MainService()

class BugsController {
  async createBug(req: Request, res: Response) {
    const data = await BugService.createIssue(req, res)

    return data
  }

  async getAllBug(req: Request, res: Response) {
    const data = await BugService.getIssue(req, res)

    return data
  }

  async updateBug(req: Request, res: Response) {
    const data = await BugService.updateIssue(req, res)

    return data
  }
}

export default BugsController
