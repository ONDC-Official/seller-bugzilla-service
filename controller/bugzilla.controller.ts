import { Response, Request } from 'express'
import BugzillaBugService from '../services/bugzilla.service'

const BugService = new BugzillaBugService()

class BugsController {
  async createBug(req: Request, res: Response) {
    const data = await BugService.createBug(req, res)

    return data
  }

  async getAllBug(req: Request, res: Response) {
    const data = await BugService.getBug(req, res)

    return data
  }

  async updateBug(req: Request, res: Response) {
    const data = await BugService.updateBug(req, res)

    return data
  }
}

export default BugsController
