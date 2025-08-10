"use strict";
/**
 * Development Intelligence Types
 * Defines the core types for the development intelligence module
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.OptimizationType = exports.MutationType = exports.AssertionType = exports.TestStatus = exports.TestFramework = exports.TestCaseType = exports.InsightType = exports.StepType = exports.TaskStatus = exports.Priority = exports.TaskType = void 0;
var TaskType;
(function (TaskType) {
    TaskType["FEATURE"] = "FEATURE";
    TaskType["BUG_FIX"] = "BUG_FIX";
    TaskType["REFACTOR"] = "REFACTOR";
    TaskType["DOCUMENTATION"] = "DOCUMENTATION";
    TaskType["TESTING"] = "TESTING";
    TaskType["DEPLOYMENT"] = "DEPLOYMENT";
    TaskType["RESEARCH"] = "RESEARCH";
    TaskType["OPTIMIZATION"] = "OPTIMIZATION";
})(TaskType || (exports.TaskType = TaskType = {}));
var Priority;
(function (Priority) {
    Priority["LOW"] = "LOW";
    Priority["MEDIUM"] = "MEDIUM";
    Priority["HIGH"] = "HIGH";
    Priority["CRITICAL"] = "CRITICAL";
})(Priority || (exports.Priority = Priority = {}));
var TaskStatus;
(function (TaskStatus) {
    TaskStatus["BACKLOG"] = "BACKLOG";
    TaskStatus["TODO"] = "TODO";
    TaskStatus["IN_PROGRESS"] = "IN_PROGRESS";
    TaskStatus["IN_REVIEW"] = "IN_REVIEW";
    TaskStatus["TESTING"] = "TESTING";
    TaskStatus["DONE"] = "DONE";
    TaskStatus["BLOCKED"] = "BLOCKED";
})(TaskStatus || (exports.TaskStatus = TaskStatus = {}));
var StepType;
(function (StepType) {
    StepType["CODE_GENERATION"] = "CODE_GENERATION";
    StepType["QUALITY_CHECK"] = "QUALITY_CHECK";
    StepType["TESTING"] = "TESTING";
    StepType["DEPLOYMENT"] = "DEPLOYMENT";
    StepType["NOTIFICATION"] = "NOTIFICATION";
    StepType["APPROVAL"] = "APPROVAL";
    StepType["CUSTOM"] = "CUSTOM";
})(StepType || (exports.StepType = StepType = {}));
var InsightType;
(function (InsightType) {
    InsightType["PERFORMANCE"] = "PERFORMANCE";
    InsightType["QUALITY"] = "QUALITY";
    InsightType["PRODUCTIVITY"] = "PRODUCTIVITY";
    InsightType["TECHNICAL_DEBT"] = "TECHNICAL_DEBT";
    InsightType["SECURITY"] = "SECURITY";
    InsightType["RESOURCE_UTILIZATION"] = "RESOURCE_UTILIZATION";
})(InsightType || (exports.InsightType = InsightType = {}));
var TestCaseType;
(function (TestCaseType) {
    TestCaseType["UNIT"] = "UNIT";
    TestCaseType["INTEGRATION"] = "INTEGRATION";
    TestCaseType["E2E"] = "E2E";
    TestCaseType["PERFORMANCE"] = "PERFORMANCE";
    TestCaseType["SECURITY"] = "SECURITY";
    TestCaseType["ACCESSIBILITY"] = "ACCESSIBILITY";
    TestCaseType["VISUAL"] = "VISUAL";
    TestCaseType["API"] = "API";
    TestCaseType["REGRESSION"] = "REGRESSION";
    TestCaseType["SMOKE"] = "SMOKE";
})(TestCaseType || (exports.TestCaseType = TestCaseType = {}));
var TestFramework;
(function (TestFramework) {
    TestFramework["JEST"] = "JEST";
    TestFramework["MOCHA"] = "MOCHA";
    TestFramework["JASMINE"] = "JASMINE";
    TestFramework["VITEST"] = "VITEST";
    TestFramework["PLAYWRIGHT"] = "PLAYWRIGHT";
    TestFramework["CYPRESS"] = "CYPRESS";
    TestFramework["SELENIUM"] = "SELENIUM";
    TestFramework["PUPPETEER"] = "PUPPETEER";
    TestFramework["SUPERTEST"] = "SUPERTEST";
    TestFramework["STORYBOOK"] = "STORYBOOK";
})(TestFramework || (exports.TestFramework = TestFramework = {}));
var TestStatus;
(function (TestStatus) {
    TestStatus["PENDING"] = "PENDING";
    TestStatus["RUNNING"] = "RUNNING";
    TestStatus["PASSED"] = "PASSED";
    TestStatus["FAILED"] = "FAILED";
    TestStatus["SKIPPED"] = "SKIPPED";
    TestStatus["TIMEOUT"] = "TIMEOUT";
    TestStatus["ERROR"] = "ERROR";
})(TestStatus || (exports.TestStatus = TestStatus = {}));
var AssertionType;
(function (AssertionType) {
    AssertionType["EQUALITY"] = "EQUALITY";
    AssertionType["TRUTHINESS"] = "TRUTHINESS";
    AssertionType["COMPARISON"] = "COMPARISON";
    AssertionType["PATTERN"] = "PATTERN";
    AssertionType["TYPE"] = "TYPE";
    AssertionType["PROPERTY"] = "PROPERTY";
    AssertionType["EXCEPTION"] = "EXCEPTION";
    AssertionType["ASYNC"] = "ASYNC";
})(AssertionType || (exports.AssertionType = AssertionType = {}));
var MutationType;
(function (MutationType) {
    MutationType["ARITHMETIC"] = "ARITHMETIC";
    MutationType["CONDITIONAL"] = "CONDITIONAL";
    MutationType["LOGICAL"] = "LOGICAL";
    MutationType["RELATIONAL"] = "RELATIONAL";
    MutationType["ASSIGNMENT"] = "ASSIGNMENT";
    MutationType["UNARY"] = "UNARY";
    MutationType["STATEMENT"] = "STATEMENT";
    MutationType["LITERAL"] = "LITERAL";
})(MutationType || (exports.MutationType = MutationType = {}));
var OptimizationType;
(function (OptimizationType) {
    OptimizationType["PARALLEL_EXECUTION"] = "PARALLEL_EXECUTION";
    OptimizationType["TEST_SELECTION"] = "TEST_SELECTION";
    OptimizationType["MOCK_OPTIMIZATION"] = "MOCK_OPTIMIZATION";
    OptimizationType["SETUP_OPTIMIZATION"] = "SETUP_OPTIMIZATION";
    OptimizationType["ASSERTION_IMPROVEMENT"] = "ASSERTION_IMPROVEMENT";
    OptimizationType["FLAKY_TEST_FIX"] = "FLAKY_TEST_FIX";
    OptimizationType["COVERAGE_IMPROVEMENT"] = "COVERAGE_IMPROVEMENT";
    OptimizationType["PERFORMANCE_TUNING"] = "PERFORMANCE_TUNING";
})(OptimizationType || (exports.OptimizationType = OptimizationType = {}));
//# sourceMappingURL=development.types.js.map