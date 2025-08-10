"use strict";
/**
 * Code Generation Engine Types
 * Defines the core types for the code generation functionality
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GenerationStatus = exports.ValidationLevel = exports.GenerationStrategy = exports.CodeTemplateType = exports.ProgrammingLanguage = void 0;
var ProgrammingLanguage;
(function (ProgrammingLanguage) {
    ProgrammingLanguage["TYPESCRIPT"] = "TYPESCRIPT";
    ProgrammingLanguage["JAVASCRIPT"] = "JAVASCRIPT";
    ProgrammingLanguage["PYTHON"] = "PYTHON";
    ProgrammingLanguage["JAVA"] = "JAVA";
    ProgrammingLanguage["GO"] = "GO";
    ProgrammingLanguage["RUST"] = "RUST";
    ProgrammingLanguage["CSHARP"] = "CSHARP";
    ProgrammingLanguage["PHP"] = "PHP";
    ProgrammingLanguage["RUBY"] = "RUBY";
    ProgrammingLanguage["KOTLIN"] = "KOTLIN";
    ProgrammingLanguage["SWIFT"] = "SWIFT";
})(ProgrammingLanguage || (exports.ProgrammingLanguage = ProgrammingLanguage = {}));
var CodeTemplateType;
(function (CodeTemplateType) {
    CodeTemplateType["COMPONENT"] = "COMPONENT";
    CodeTemplateType["SERVICE"] = "SERVICE";
    CodeTemplateType["MODEL"] = "MODEL";
    CodeTemplateType["CONTROLLER"] = "CONTROLLER";
    CodeTemplateType["TEST"] = "TEST";
    CodeTemplateType["CONFIG"] = "CONFIG";
    CodeTemplateType["MIDDLEWARE"] = "MIDDLEWARE";
    CodeTemplateType["UTILITY"] = "UTILITY";
    CodeTemplateType["API_ENDPOINT"] = "API_ENDPOINT";
    CodeTemplateType["DATABASE_MIGRATION"] = "DATABASE_MIGRATION";
})(CodeTemplateType || (exports.CodeTemplateType = CodeTemplateType = {}));
var GenerationStrategy;
(function (GenerationStrategy) {
    GenerationStrategy["TEMPLATE_BASED"] = "TEMPLATE_BASED";
    GenerationStrategy["AI_ASSISTED"] = "AI_ASSISTED";
    GenerationStrategy["HYBRID"] = "HYBRID";
    GenerationStrategy["PATTERN_MATCHING"] = "PATTERN_MATCHING";
})(GenerationStrategy || (exports.GenerationStrategy = GenerationStrategy = {}));
var ValidationLevel;
(function (ValidationLevel) {
    ValidationLevel["SYNTAX"] = "SYNTAX";
    ValidationLevel["SEMANTIC"] = "SEMANTIC";
    ValidationLevel["QUALITY"] = "QUALITY";
    ValidationLevel["SECURITY"] = "SECURITY";
    ValidationLevel["PERFORMANCE"] = "PERFORMANCE";
    ValidationLevel["FULL"] = "FULL";
})(ValidationLevel || (exports.ValidationLevel = ValidationLevel = {}));
var GenerationStatus;
(function (GenerationStatus) {
    GenerationStatus["PENDING"] = "PENDING";
    GenerationStatus["IN_PROGRESS"] = "IN_PROGRESS";
    GenerationStatus["COMPLETED"] = "COMPLETED";
    GenerationStatus["FAILED"] = "FAILED";
    GenerationStatus["CANCELLED"] = "CANCELLED";
})(GenerationStatus || (exports.GenerationStatus = GenerationStatus = {}));
//# sourceMappingURL=code-generation.types.js.map