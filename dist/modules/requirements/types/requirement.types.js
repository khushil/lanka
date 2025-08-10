"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequirementPriority = exports.RequirementStatus = exports.RequirementType = void 0;
var RequirementType;
(function (RequirementType) {
    RequirementType["BUSINESS"] = "BUSINESS";
    RequirementType["FUNCTIONAL"] = "FUNCTIONAL";
    RequirementType["NON_FUNCTIONAL"] = "NON_FUNCTIONAL";
    RequirementType["USER_STORY"] = "USER_STORY";
    RequirementType["ACCEPTANCE_CRITERIA"] = "ACCEPTANCE_CRITERIA";
    RequirementType["BUSINESS_RULE"] = "BUSINESS_RULE";
    RequirementType["COMPLIANCE"] = "COMPLIANCE";
})(RequirementType || (exports.RequirementType = RequirementType = {}));
var RequirementStatus;
(function (RequirementStatus) {
    RequirementStatus["DRAFT"] = "DRAFT";
    RequirementStatus["REVIEW"] = "REVIEW";
    RequirementStatus["APPROVED"] = "APPROVED";
    RequirementStatus["IMPLEMENTED"] = "IMPLEMENTED";
    RequirementStatus["VALIDATED"] = "VALIDATED";
    RequirementStatus["DEPRECATED"] = "DEPRECATED";
})(RequirementStatus || (exports.RequirementStatus = RequirementStatus = {}));
var RequirementPriority;
(function (RequirementPriority) {
    RequirementPriority["CRITICAL"] = "CRITICAL";
    RequirementPriority["HIGH"] = "HIGH";
    RequirementPriority["MEDIUM"] = "MEDIUM";
    RequirementPriority["LOW"] = "LOW";
})(RequirementPriority || (exports.RequirementPriority = RequirementPriority = {}));
//# sourceMappingURL=requirement.types.js.map