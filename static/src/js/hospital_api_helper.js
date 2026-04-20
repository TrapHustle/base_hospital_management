/**
 * JSON-RPC API Helper for Frontend-Decoupled Dashboards
 * Provides utility functions to call Odoo backend APIs without OWL ORM
 */

class HospitalOdooAPI {
    constructor(baseUrl = '/web/dataset/call_kw') {
        this.baseUrl = baseUrl;
        this.sessionId = document.documentElement.getAttribute('data-session-id');
    }

    /**
     * Make a JSON-RPC call to Odoo backend
     * @param {string} model - Model name (e.g., 'hospital.outpatient')
     * @param {string} method - Method name (e.g., 'search_read')
     * @param {array} args - Positional arguments
     * @param {object} kwargs - Keyword arguments
     * @returns {Promise} API response promise
     */
    async call(model, method, args = [], kwargs = {}) {
        const payload = {
            jsonrpc: '2.0',
            method: 'call',
            params: {
                service: 'object',
                args: [model, method, ...args],
                kwargs: kwargs
            },
            id: Math.random().toString(36).substr(2, 9)
        };

        try {
            const response = await fetch(this.baseUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Openerp-Session-Id': this.sessionId || ''
                },
                body: JSON.stringify(payload),
                credentials: 'same-origin'
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data.error) {
                console.error('RPC Error:', data.error);
                throw new Error(data.error.message || 'Unknown RPC error');
            }

            return data.result;
        } catch (error) {
            console.error('API Call Error:', error);
            throw error;
        }
    }

    /**
     * Search records
     * @param {string} model - Model name
     * @param {array} domain - Search domain
     * @param {object} options - Options (offset, limit, order, fields)
     * @returns {Promise}
     */
    async search(model, domain = [], options = {}) {
        const kwargs = {
            domain: domain,
            offset: options.offset || 0,
            limit: options.limit || 80,
            order: options.order || 'id DESC'
        };
        return this.call(model, 'search', [], kwargs);
    }

    /**
     * Search and read records
     * @param {string} model - Model name
     * @param {array} domain - Search domain
     * @param {array} fields - Fields to read
     * @param {object} options - Options (offset, limit, order)
     * @returns {Promise}
     */
    async searchRead(model, domain = [], fields = [], options = {}) {
        const kwargs = {
            domain: domain,
            fields: fields || [],
            offset: options.offset || 0,
            limit: options.limit || 80,
            order: options.order || 'id DESC'
        };
        return this.call(model, 'search_read', [], kwargs);
    }

    /**
     * Read records
     * @param {string} model - Model name
     * @param {array} ids - Record IDs
     * @param {array} fields - Fields to read
     * @returns {Promise}
     */
    async read(model, ids = [], fields = []) {
        return this.call(model, 'read', [ids, fields || []]);
    }

    /**
     * Get record count
     * @param {string} model - Model name
     * @param {array} domain - Search domain
     * @returns {Promise}
     */
    async searchCount(model, domain = []) {
        return this.call(model, 'search_count', [], { domain: domain });
    }

    /**
     * Create a record
     * @param {string} model - Model name
     * @param {object} values - Values to create
     * @returns {Promise}
     */
    async create(model, values = {}) {
        return this.call(model, 'create', [values]);
    }

    /**
     * Update records
     * @param {string} model - Model name
     * @param {array} ids - Record IDs
     * @param {object} values - Values to update
     * @returns {Promise}
     */
    async write(model, ids = [], values = {}) {
        return this.call(model, 'write', [ids, values]);
    }

    /**
     * Unlink (delete) records
     * @param {string} model - Model name
     * @param {array} ids - Record IDs
     * @returns {Promise}
     */
    async unlink(model, ids = []) {
        return this.call(model, 'unlink', [ids]);
    }

    /**
     * Call any model method
     * @param {string} model - Model name
     * @param {string} method - Method name
     * @param {array} ids - Record IDs
     * @param {...any} args - Additional arguments
     * @returns {Promise}
     */
    async callMethod(model, method, ids = [], ...args) {
        return this.call(model, method, [ids, ...args]);
    }
}

// Create global instance
window.hospitalAPI = new HospitalOdooAPI();

export { HospitalOdooAPI };
