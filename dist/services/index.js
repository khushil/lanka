"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeServices = initializeServices;
const neo4j_1 = require("../core/database/neo4j");
const requirements_service_1 = require("../modules/requirements/services/requirements.service");
const architecture_service_1 = require("../modules/architecture/services/architecture.service");
const development_service_1 = require("../modules/development/services/development.service");
const logger_1 = require("../core/logging/logger");
async function initializeServices() {
    logger_1.logger.info('Initializing LANKA services...');
    const neo4j = neo4j_1.Neo4jService.getInstance();
    const requirements = new requirements_service_1.RequirementsService(neo4j);
    const architecture = new architecture_service_1.ArchitectureService(neo4j);
    const development = new development_service_1.DevelopmentService(neo4j);
    logger_1.logger.info('All services initialized successfully');
    return {
        requirements,
        architecture,
        development,
        neo4j,
    };
}
//# sourceMappingURL=index.js.map