const Path = require('path-parser');

const getPathParameters = (allPaths, endpoint) => {
    let _path;
    let pathParameters;

    if (!allPaths) {
        return {
            pathPattern: endpoint,
            pathParameters: {}
        };
    }

    for (let i = 0; i < allPaths.length; i++) {
        _path = allPaths[i];
        pathParameters = _path.path.test(endpoint);
        if (pathParameters !== null) {
            return {pathPattern: _path.pattern, pathParameters};
        }
    }
};

const convertRoute = (route) => {
    const _route = route.replace(/{(.+?)}/g, ':$1');

    return new Path(_route);
};

const getRoutes = (obj) => {
    let r;
    let k;
    const toReturn = [];

    for (k in obj) {
        if (!Object.prototype.hasOwnProperty.call(obj, k)) {
            continue;
        }

        k = `/${k}`;
        r = {
            path: convertRoute(k),
            pattern: k
        };

        toReturn.push(r);
    }

    return toReturn;
};

module.exports = {
    getRoutes,
    getPathParameters
};
