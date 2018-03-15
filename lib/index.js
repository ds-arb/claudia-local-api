'use strict';

const program = require('commander');
const path = require('path');

const packageJson = require('../package');
const pathHandlers = require('./pathParameters');

function getDefaultConfig() {
    return {
        port: 3000
    };
}

function initServer() {
    const express = require('express');
    const bodyParser = require('body-parser');

    const server = express();
    server.use(bodyParser.urlencoded({
        limit: '50mb',
        extended: true
    }));
    server.use(bodyParser.json({limit: '50mb'}));

    return server;
}

function initLogger() {
    const bunyan = require('bunyan');
    return bunyan.createLogger({
        name: packageJson.name
    });
}

function logJson(logger, body) {
    logger.info(JSON.stringify(body, null, 4));
}

function logError(logger, error) {
    logger.error(error.stack);
}

function getParams(req, app) {
    const allPaths = pathHandlers.getAllPaths(app);
    const pathname = pathHandlers.getPathName(req);
    const pathParams = pathHandlers.getPathParameters(allPaths, pathname);

    return {
        requestContext: {
            resourcePath: pathParams.pathPattern,
            httpMethod: req.method
        },
        headers: req.headers,
        queryStringParameters: req.query,
        body: req.body,
        pathParameters: pathParams.pathParameters
    };
}

function makeHandleResponse(logger, res) {
    return function (err, response) {
        if (err) {
            logError(logger, err);
            const body = {
                message: err.message
            };
            return res
                .status(500)
                .send(body);
        }
        logJson(logger, response);
        return res
            .set(response.headers || {})
            .status(response.statusCode || 200)
            .send(response.body || {});
    };
}

function makeHandleRequest(logger, app) {
    return function (req, res) {
        const params = getParams(req, app);
        logJson(logger, params);
        app.proxyRouter(params, {
            done: makeHandleResponse(logger, res)
        });
    };
}

function bootstrap(server, logger, claudiaApp, options) {
    const handleRequest = makeHandleRequest(logger, claudiaApp);

    server.all('*', handleRequest);
    const instance = server.listen(options.port);
    logger.info(`Server listening on ${options.port}`);
    return instance;
}

function runCmd(bootstrapFn) {
    const config = getDefaultConfig();
    program
        .version(packageJson.version)
        .option('-a --api-module <apiModule>', 'Specify claudia api path from project root')
        .option('-p --port [port]', `Specify port to use [${config.port}]`, config.port)
        .parse(process.argv);

    const apiPath = path.join(process.cwd(), program.apiModule);
    const claudiaApp = require(apiPath);
    const server = initServer();
    const logger = initLogger();

    // Extract all routes from App and save it in app instance.
    claudiaApp.allPaths = pathHandlers.getRoutes(claudiaApp.apiConfig().routes);

    bootstrapFn(server, logger, claudiaApp, program);
}

module.exports = {
    run: runCmd.bind(null, bootstrap)
};
