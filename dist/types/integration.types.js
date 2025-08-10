"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidationStatus = exports.AlignmentType = exports.ConstraintType = exports.RequirementMappingType = void 0;
var RequirementMappingType;
(function (RequirementMappingType) {
    RequirementMappingType["DIRECT"] = "DIRECT";
    RequirementMappingType["DERIVED"] = "DERIVED";
    RequirementMappingType["INFLUENCED"] = "INFLUENCED";
    RequirementMappingType["CONSTRAINT"] = "CONSTRAINT";
    RequirementMappingType["QUALITY_ATTRIBUTE"] = "QUALITY_ATTRIBUTE";
})(RequirementMappingType || (exports.RequirementMappingType = RequirementMappingType = {}));
var ConstraintType;
(function (ConstraintType) {
    ConstraintType["PERFORMANCE"] = "PERFORMANCE";
    ConstraintType["SECURITY"] = "SECURITY";
    ConstraintType["SCALABILITY"] = "SCALABILITY";
    ConstraintType["COMPLIANCE"] = "COMPLIANCE";
    ConstraintType["INTEGRATION"] = "INTEGRATION";
    ConstraintType["OPERATIONAL"] = "OPERATIONAL";
    ConstraintType["BUDGET"] = "BUDGET";
})(ConstraintType || (exports.ConstraintType = ConstraintType = {}));
var AlignmentType;
(function (AlignmentType) {
    AlignmentType["FULLY_ALIGNED"] = "FULLY_ALIGNED";
    AlignmentType["PARTIALLY_ALIGNED"] = "PARTIALLY_ALIGNED";
    AlignmentType["MISALIGNED"] = "MISALIGNED";
    AlignmentType["NOT_APPLICABLE"] = "NOT_APPLICABLE";
})(AlignmentType || (exports.AlignmentType = AlignmentType = {}));
var ValidationStatus;
(function (ValidationStatus) {
    ValidationStatus["PENDING"] = "PENDING";
    ValidationStatus["VALIDATED"] = "VALIDATED";
    ValidationStatus["NEEDS_REVIEW"] = "NEEDS_REVIEW";
    ValidationStatus["REJECTED"] = "REJECTED";
})(ValidationStatus || (exports.ValidationStatus = ValidationStatus = {}));
//# sourceMappingURL=integration.types.js.map