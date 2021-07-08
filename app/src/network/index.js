import request from './request.js';

/**
 *
 * @constant timeout
 * @desc request time out
 */
const TIMEOUT = 120000; // 2 minutes

/**
 * @function network
 * @public
 * @version 1.0
 * @since 1.0
 * @desc Factory function to create a object that can send
 * requests to a specific resource on the server.
 * @param {string} accessToken optionnal param used for protected routes
 * @return {promise} response
 */
const network = (accessToken) => {
    // Default options used for every request
    const defaultOptions = {
        baseURL: 'http://localhost:8080',
        timeout: TIMEOUT,
        responseType: 'json',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            ...(accessToken ? {
                'Authorization': `Bearer ${accessToken}`,
            } : {}),
        },
    };

    return {

        /**
         * @function post
         * @desc Make a POST request.
         * @param {string} path route path
         * @param {object} data DTO body
         * @param {object} options option request
         * @returns {promise} with the response
         * @public
         * @version 1.0
         * @since 1.0
         */
        post: (path, data, options = {}) => {
            return request(path, Object.assign({},
                defaultOptions,
                options,
                {
                    method: 'post',
                    data,
                }
            ));
        },

        /**
         * @function get
         * @desc Make a GET request.
         * @param {string} path route path
         * @param {object} params get param
         * @param {object} options option
         * @returns {promise} with the response
         * @public
         * @version 1.0
         * @since 1.0
         */
        get: (path, params, options = {}) => {
            return request(path, Object.assign({},
                defaultOptions,
                options,
                {
                    method: 'get',
                    params,
                }
            ));
        },

        /**
         * @function put
         * @desc Make a PUT request.
         * @param {string} path route path
         * @param {object} data DTO body
         * @param {object} options option
         * @returns {promise} with the response
         * @public
         * @version 1.0
         * @since 1.0
         */
        put: (path, data, options = {}) => {
            return request(path, Object.assign({},
                defaultOptions,
                options,
                {
                    method: 'put',
                    data,
                }
            ));
        },

        /**
         * @function patch
         * @desc Make a PUT request.
         * @param {string} path route path
         * @param {object} data DTO body
         * @param {object} options option
         * @returns {promise} with the response
         * @public
         * @version 1.0
         * @since 1.0
         */
        patch: (path, data, options = {}) => {
            return request(path, Object.assign({},
                defaultOptions,
                options,
                {
                    method: 'patch',
                    data,
                }
            ));
        },

        /**
         * @function delete
         * @desc Make a DELETE request.
         * @param {string} path route path
         * @param {object} options option
         * @returns {promise} with the response
         * @public
         * @version 1.0
         * @since 1.0
         */
        delete: (path, options = {}) => {
            return request(path, Object.assign({},
                defaultOptions,
                options,
                {
                    method: 'delete',
                }
            ));
        },
    };
};

export default network;
