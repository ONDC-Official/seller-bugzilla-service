import { ICreateBug, ICreateTicket } from '../interfaces/Bugs'
import Joi from 'joi'

export function CreateBugSchemaValidator(bugObject: ICreateBug) {
  const schema = Joi.object({
    product: Joi.string().required(),
    summary: Joi.string().required(),
    alias: Joi.string().required().max(40),
    bpp_id: Joi.string().required(),
    bpp_name: Joi.string().required(),
    attachments: Joi.array().items(Joi.string()),
    action: Joi.object(),
  })

  const { error } = schema.validate(bugObject)

  return error
}

export function CreateTicketSchemaValidator(bugObject: ICreateTicket) {
  const schema = Joi.object({
    subject: Joi.string().required(),
    issue: Joi.string().required(),
    owner: Joi.string().required(),
    group: Joi.string().required(),
    type: Joi.string().required(),
    priority: Joi.string().required(),
    product: Joi.string().required(),
  })

  const { error } = schema.validate(bugObject)

  return error
}
