"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const validator_1 = require("../utils/validator");
const logger_1 = require("../shared/logger");
const HttpRequest_1 = __importDefault(require("../utils/HttpRequest"));
const product_service_1 = __importDefault(require("./product.service"));
const user_service_1 = __importDefault(require("./user.service"));
const component_service_1 = __importDefault(require("./component.service"));
const productService = new product_service_1.default();
const userService = new user_service_1.default();
const componentService = new component_service_1.default();
class BugzillaBugService {
    constructor() {
        this.key = process.env.BUGZILLA_API_KEY || 'fyllmSnPzW4qLtviHHQmJeb5llfnT2pcyJYSab5k';
        this.createBug = this.createBug.bind(this);
        this.updateBug = this.updateBug.bind(this);
    }
    addAttachments({ bugId, data }) {
        return __awaiter(this, void 0, void 0, function* () {
            const attachmentRequest = new HttpRequest_1.default({
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
            });
            const attachmentResponse = yield attachmentRequest.send();
            return attachmentResponse;
        });
    }
    createBug(req, res) {
        var _a, _b, _c, _d, _e, _f;
        return __awaiter(this, void 0, void 0, function* () {
            let isProductExist = false;
            const data = {
                product: req.body.product,
                summary: req.body.summary,
                alias: req.body.alias,
                bpp_id: req.body.bpp_id,
                bpp_name: req.body.bpp_name,
                attachments: req.body.attachments,
                action: req.body.action,
            };
            try {
                const error = (0, validator_1.CreateBugSchemaValidator)(data);
                if (error)
                    return res.status(500).json({ error: true, message: error.message });
                logger_1.logger.info('Hitting');
                const userResponse = yield userService.getUser({ userId: data.bpp_id });
                if (!((_b = (_a = userResponse === null || userResponse === void 0 ? void 0 : userResponse.data) === null || _a === void 0 ? void 0 : _a.users) === null || _b === void 0 ? void 0 : _b[0])) {
                    yield userService.createUser({
                        email: `${data.bpp_name.trim().toLowerCase().replace(/\s/g, '')}@example.com`,
                        full_name: data.bpp_name,
                        login: data.bpp_id,
                    });
                }
                const serviceRes = yield productService.getProduct({
                    productId: `${data.product.toLowerCase().replace(/\s/g, '')}`,
                });
                if ((_d = (_c = serviceRes === null || serviceRes === void 0 ? void 0 : serviceRes.data) === null || _c === void 0 ? void 0 : _c.products[0]) === null || _d === void 0 ? void 0 : _d.id) {
                    isProductExist = true;
                }
                if (!isProductExist) {
                    yield productService.registerProduct({
                        name: data.product.replace(/\s/g, '').toLowerCase(),
                        description: data.summary,
                        is_open: true,
                        has_unconfirmed: true,
                        version: 'Unspecified',
                    });
                    yield componentService.createComponent({
                        default_assignee: data.bpp_id,
                        description: 'Contact details',
                        name: 'Component',
                        product: data.product.replace(/\s/g, '').toLowerCase(),
                        is_open: 1,
                    });
                }
                const complaint_actions_merged = [...data.action.complainant_actions, ...data.action.respondent_actions];
                const sortedDataByDate = this.sortByDate(complaint_actions_merged);
                const createBug = new HttpRequest_1.default({
                    url: '/rest/bug',
                    method: 'post',
                    headers: { 'X-BUGZILLA-API-KEY': this.key },
                    data: {
                        product: data.product.toLowerCase().replace(/\s/g, ''),
                        summary: data.summary,
                        component: 'Component',
                        version: 'unspecified',
                        op_sys: 'ALL',
                        rep_platform: 'ALL',
                        alias: data.alias,
                    },
                });
                const response = yield createBug.send();
                if ((data === null || data === void 0 ? void 0 : data.attachments) && ((_e = data === null || data === void 0 ? void 0 : data.attachments) === null || _e === void 0 ? void 0 : _e.length) !== 0) {
                    yield this.addAttachments({
                        bugId: (_f = response === null || response === void 0 ? void 0 : response.data) === null || _f === void 0 ? void 0 : _f.id,
                        data: data === null || data === void 0 ? void 0 : data.attachments[0],
                    });
                }
                if (response.data) {
                    for (const item of sortedDataByDate) {
                        const comment = this.generateTheCommentFromObject(item);
                        yield this.addComments({ bugId: response.data.id, data: comment });
                    }
                }
                return res.status(201).json({ success: true, data: response === null || response === void 0 ? void 0 : response.data, alias: data.alias });
            }
            catch (error) {
                logger_1.logger.error(error);
                return res.status(500).json({ error: true, message: error || 'Something went wrong' });
            }
        });
    }
    sortByDate(array) {
        return array.sort((a, b) => {
            const dateA = new Date(a.updated_at);
            const dateB = new Date(b.updated_at);
            return dateA - dateB;
        });
    }
    addComments({ bugId, data }) {
        return __awaiter(this, void 0, void 0, function* () {
            const getAttachment = new HttpRequest_1.default({
                url: `/rest/bug/${bugId}/comment`,
                method: 'post',
                data: {
                    comment: data,
                },
                headers: { 'X-BUGZILLA-API-KEY': this.key },
            });
            const getAttachmentResponse = yield getAttachment.send();
            return getAttachmentResponse === null || getAttachmentResponse === void 0 ? void 0 : getAttachmentResponse.data;
        });
    }
    getAttachment({ bugId }) {
        return __awaiter(this, void 0, void 0, function* () {
            const getAttachment = new HttpRequest_1.default({
                url: `/rest/bug/${bugId}/attachment`,
                method: 'get',
                headers: { 'X-BUGZILLA-API-KEY': this.key },
            });
            const getAttachmentResponse = yield getAttachment.send();
            return getAttachmentResponse === null || getAttachmentResponse === void 0 ? void 0 : getAttachmentResponse.data;
        });
    }
    getBug(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const getInstance = new HttpRequest_1.default({
                    url: `/rest/bug?id=${req.params.id}`,
                    method: 'get',
                    headers: { 'X-BUGZILLA-API-KEY': this.key },
                });
                const response = yield getInstance.send();
                const getAttachmentsResponse = yield this.getAttachment({ bugId: req.params.id });
                return res.status(200).json({ success: true, bug: response === null || response === void 0 ? void 0 : response.data, attachments: getAttachmentsResponse });
            }
            catch (error) {
                logger_1.logger.error(error);
                return res.status(500).json({ error: true, message: (error === null || error === void 0 ? void 0 : error.message) || 'Something went wrong' });
            }
        });
    }
    updateBug(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const complaint_actions_merged = [...req.body.action.complainant_actions, ...req.body.action.respondent_actions];
            const latestIssueAction = complaint_actions_merged.reduce((last, current) => {
                if (current.updated_at > last.updated_at) {
                    return current;
                }
                return last;
            });
            try {
                const latestCommit = this.generateTheCommentFromObject(latestIssueAction);
                const getInstance = new HttpRequest_1.default({
                    url: `/rest/bug/${req.params.id}`,
                    method: 'put',
                    data: this.getStatus(req.body.status, latestCommit),
                    headers: { 'X-BUGZILLA-API-KEY': this.key },
                });
                const response = yield getInstance.send();
                return res.status(200).json({ success: true, data: response === null || response === void 0 ? void 0 : response.data });
            }
            catch (error) {
                logger_1.logger.error(error);
                return res.status(500).json({ error: true, message: (error === null || error === void 0 ? void 0 : error.message) || 'Something went wrong' });
            }
        });
    }
    getStatus(status, comments) {
        switch (status) {
            case 'RESOLVED':
                return {
                    status: 'RESOLVED',
                    resolution: 'FIXED',
                    comment: {
                        body: comments,
                    },
                };
            default:
                return {
                    status: status,
                    comment: {
                        body: comments,
                    },
                };
        }
    }
    generateTheCommentFromObject(item) {
        const keys = Object.keys(item);
        switch (keys[0]) {
            case 'complainant_action':
                return `\nAction Taken: ${item.complainant_action}\nAction Comment:  ${item.short_desc}\nAction Taken By: Complainant\nAction Taken At:  ${item.updated_at}`;
            case 'respondent_action':
                return `Action Taken: ${item.respondent_action}\nAction Comment:  ${item.short_desc}\nAction Taken By: Respondent\nAction Taken At:  ${item.updated_at}`;
            default:
                return '';
        }
    }
}
exports.default = BugzillaBugService;
