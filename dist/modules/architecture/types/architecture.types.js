"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CloudProvider = exports.ArchitecturePatternType = exports.ArchitectureDecisionStatus = void 0;
var ArchitectureDecisionStatus;
(function (ArchitectureDecisionStatus) {
    ArchitectureDecisionStatus["DRAFT"] = "DRAFT";
    ArchitectureDecisionStatus["PROPOSED"] = "PROPOSED";
    ArchitectureDecisionStatus["APPROVED"] = "APPROVED";
    ArchitectureDecisionStatus["IMPLEMENTED"] = "IMPLEMENTED";
    ArchitectureDecisionStatus["DEPRECATED"] = "DEPRECATED";
    ArchitectureDecisionStatus["SUPERSEDED"] = "SUPERSEDED";
})(ArchitectureDecisionStatus || (exports.ArchitectureDecisionStatus = ArchitectureDecisionStatus = {}));
var ArchitecturePatternType;
(function (ArchitecturePatternType) {
    ArchitecturePatternType["MICROSERVICES"] = "MICROSERVICES";
    ArchitecturePatternType["MONOLITHIC"] = "MONOLITHIC";
    ArchitecturePatternType["SERVERLESS"] = "SERVERLESS";
    ArchitecturePatternType["EVENT_DRIVEN"] = "EVENT_DRIVEN";
    ArchitecturePatternType["LAYERED"] = "LAYERED";
    ArchitecturePatternType["HEXAGONAL"] = "HEXAGONAL";
    ArchitecturePatternType["CQRS"] = "CQRS";
    ArchitecturePatternType["SAGA"] = "SAGA";
})(ArchitecturePatternType || (exports.ArchitecturePatternType = ArchitecturePatternType = {}));
var CloudProvider;
(function (CloudProvider) {
    CloudProvider["AWS"] = "AWS";
    CloudProvider["AZURE"] = "AZURE";
    CloudProvider["GCP"] = "GCP";
    CloudProvider["ONPREMISES"] = "ONPREMISES";
    CloudProvider["HYBRID"] = "HYBRID";
})(CloudProvider || (exports.CloudProvider = CloudProvider = {}));
//# sourceMappingURL=architecture.types.js.map