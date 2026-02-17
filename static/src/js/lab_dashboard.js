/** @odoo-module */
import { registry } from '@web/core/registry';
import { useService } from "@web/core/utils/hooks";
import { useRef, onMounted, onWillUnmount } from "@odoo/owl";
import { Component, useState } from "@odoo/owl";
import { _t } from "@web/core/l10n/translation";
import { user } from "@web/core/user";

export class LabDashBoard extends Component {
    setup() {
        super.setup(...arguments);
        
        // Refs
        this.ref = useRef("root");
        
        // Chart refs
        this.testsByTypeChartRef = useRef("testsByTypeChart");
        this.dailyCompletedChartRef = useRef("dailyCompletedChart");
        this.resultsStatusChartRef = useRef("resultsStatusChart");
        this.processingTimeChartRef = useRef("processingTimeChart");
        
        // Services
        this.orm = useService('orm');
        this.user = user;
        this.actionService = useService("action");
        
        // State
        this.state = useState({
            tests_confirm: [],
            tests_confirm_data: [],
            test_data: [],
            all_test_data: [],
            process_data: [],
            process_test_data: [],
            published_data: [],
            activeView: 'main',
            viewMode: 'table', // table or kanban
            currentRecordId: null,
            user_name: '',
            lab_name: '',
            currency_symbol: '$',
            stats: {
                tests_pending: 0,
                tests_in_progress: 0,
                tests_completed: 0,
                results_published: 0,
                completed_today: 0,
                processing_trend: 0,
            },
            chart_data: {
                tests_by_type: {},
                daily_completed: [],
                results_status: {},
                processing_time: [],
            },
        });

        // Charts instances
        this.charts = {
            testsByType: null,
            dailyCompleted: null,
            resultsStatus: null,
            processingTime: null,
        };

        onMounted(async () => {
            await this.loadDashboardData();
            await this._loadTestData();
        });

        onWillUnmount(() => {
            this.destroyCharts();
        });
    }

    /**
     * Load all dashboard data
     */
    async loadDashboardData() {
        try {
            // Get user info
            this.state.user_name = this.user.name || 'Lab Technician';
            
            // Load statistics
            await this.loadStatistics();
            
            // Load chart data
            await this.loadChartData();
        } catch (error) {
            console.error('Error loading dashboard data:', error);
        }
    }

    /**
     * Load lab statistics
     */
    async loadStatistics() {
        try {
            const stats = await this.orm.call(
                'hospital.laboratory',
                'get_lab_statistics',
                []
            );
            
            if (stats) {
                this.state.stats = {
                    ...this.state.stats,
                    ...stats
                };
            }
        } catch (error) {
            console.error('Error loading statistics:', error);
            await this.loadStatisticsFallback();
        }
    }

    /**
     * Fallback method to load statistics
     */
    async loadStatisticsFallback() {
        const today = new Date().toISOString().split('T')[0];
        
        // Tests pending
        const testsPending = await this.orm.call(
            'lab.test.line',
            'search_count',
            [[['state', '=', 'draft']]]
        );
        this.state.stats.tests_pending = testsPending;
        
        // Tests in progress
        const testsInProgress = await this.orm.call(
            'patient.lab.test',
            'search_count',
            [[['state', '=', 'test']]]
        );
        this.state.stats.tests_in_progress = testsInProgress;
        
        // Tests completed
        const testsCompleted = await this.orm.call(
            'patient.lab.test',
            'search_count',
            [[['state', '=', 'completed']]]
        );
        this.state.stats.tests_completed = testsCompleted;
        
        // Results published
        const resultsPublished = await this.orm.call(
            'lab.test.result',
            'search_count',
            [[['state', '=', 'published']]]
        );
        this.state.stats.results_published = resultsPublished;
        
        // Tests completed today
        const completedToday = await this.orm.call(
            'patient.lab.test',
            'search_count',
            [[['state', '=', 'completed'], ['date', '=', today]]]
        );
        this.state.stats.completed_today = completedToday;
    }

    /**
     * Load chart data
     */
    async loadChartData() {
        try {
            const chartData = await this.orm.call(
                'hospital.laboratory',
                'get_lab_charts_data',
                []
            );
            
            if (chartData) {
                this.state.chart_data = {
                    ...this.state.chart_data,
                    ...chartData
                };
            }
        } catch (error) {
            console.error('Error loading chart data:', error);
            await this.loadChartDataFallback();
        }
    }

    /**
     * Fallback method to load chart data
     */
    async loadChartDataFallback() {
        // Tests by type
        const labTests = await this.orm.call(
            'lab.test',
            'search_read',
            [[], ['name']]
        );
        
        const testsByType = {};
        for (const test of labTests) {
            const count = await this.orm.call(
                'patient.lab.test',
                'search_count',
                [[['test_ids', 'in', test.id]]]
            );
            if (count > 0) {
                testsByType[test.name] = count;
            }
        }
        this.state.chart_data.tests_by_type = testsByType;
        
        // Results status
        const processing = await this.orm.call(
            'lab.test.result',
            'search_count',
            [[['state', '=', 'processing']]]
        );
        
        const published = await this.orm.call(
            'lab.test.result',
            'search_count',
            [[['state', '=', 'published']]]
        );
        
        this.state.chart_data.results_status = {
            processing: processing,
            published: published
        };
    }

    /**
     * Initialize all charts
     */
    initializeCharts() {
        if (typeof Chart === 'undefined') {
            console.error('Chart.js not loaded');
            return;
        }

        const odooColors = {
            primary: '#714B67',
            secondary: '#875A7B',
            accent: '#D4A5C3',
            success: '#28A745',
            warning: '#FFC107',
            info: '#17A2B8',
            danger: '#DC3545'
        };

        Chart.defaults.font.family = "'Inter', sans-serif";
        Chart.defaults.color = '#6C757D';

        this.initTestsByTypeChart(odooColors);
        this.initDailyCompletedChart(odooColors);
        this.initResultsStatusChart(odooColors);
        this.initProcessingTimeChart(odooColors);
    }

    /**
     * Initialize tests by type chart
     */
    initTestsByTypeChart(colors) {
        const ctx = this.testsByTypeChartRef.el?.getContext('2d');
        if (!ctx) return;

        const data = this.state.chart_data.tests_by_type || {};
        const labels = Object.keys(data);
        const values = Object.values(data);
        
        this.charts.testsByType = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels.length ? labels : ['Blood Test', 'Urine Test', 'X-Ray', 'ECG', 'Other'],
                datasets: [{
                    data: values.length ? values : [45, 25, 15, 10, 5],
                    backgroundColor: [
                        colors.primary,
                        colors.secondary,
                        colors.info,
                        colors.success,
                        colors.warning
                    ],
                    borderWidth: 0,
                    hoverOffset: 10
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 15,
                            usePointStyle: true,
                            font: { size: 11 }
                        }
                    }
                }
            }
        });
    }

    /**
     * Initialize daily completed chart
     */
    initDailyCompletedChart(colors) {
        const ctx = this.dailyCompletedChartRef.el?.getContext('2d');
        if (!ctx) return;

        const data = this.state.chart_data.daily_completed || [];
        
        this.charts.dailyCompleted = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.length ? data.map(d => d.date) : ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'],
                datasets: [{
                    label: 'Tests Complétés',
                    data: data.length ? data.map(d => d.count) : [12, 15, 18, 14, 20, 8, 5],
                    backgroundColor: colors.primary,
                    borderRadius: 8,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: '#F0E6ED' }
                    },
                    x: {
                        grid: { display: false }
                    }
                }
            }
        });
    }

    /**
     * Initialize results status chart
     */
    initResultsStatusChart(colors) {
        const ctx = this.resultsStatusChartRef.el?.getContext('2d');
        if (!ctx) return;

        const data = this.state.chart_data.results_status || {};
        
        this.charts.resultsStatus = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: ['En Traitement', 'Publiés'],
                datasets: [{
                    data: [data.processing || 15, data.published || 85],
                    backgroundColor: [colors.warning, colors.success],
                    borderWidth: 0,
                    hoverOffset: 10
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 15,
                            usePointStyle: true,
                            font: { size: 11 }
                        }
                    }
                }
            }
        });
    }

    /**
     * Initialize processing time chart
     */
    initProcessingTimeChart(colors) {
        const ctx = this.processingTimeChartRef.el?.getContext('2d');
        if (!ctx) return;

        const data = this.state.chart_data.processing_time || [];
        
        this.charts.processingTime = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.length ? data.map(d => d.test_type) : ['Blood', 'Urine', 'X-Ray', 'ECG', 'CT Scan'],
                datasets: [{
                    label: 'Heures Moyennes',
                    data: data.length ? data.map(d => d.avg_hours) : [2, 1.5, 0.5, 0.3, 4],
                    borderColor: colors.secondary,
                    backgroundColor: colors.accent + '40',
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: colors.secondary,
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 5,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: '#F0E6ED' },
                        title: {
                            display: true,
                            text: 'Heures'
                        }
                    },
                    x: {
                        grid: { display: false }
                    }
                }
            }
        });
    }

    /**
     * Destroy all charts
     */
    destroyCharts() {
        Object.values(this.charts).forEach(chart => {
            if (chart) {
                chart.destroy();
            }
        });
    }

    /**
     * Load tests to confirm
     */
    async _loadTestData() {
        this._setActiveView('main');
        const domain = [['state', '=', 'draft']];
        const result = await this.orm.call('lab.test.line', 'search_read', [domain]);
        this.state.tests_confirm = result;
        
        // Reload stats
        await this.loadStatistics();
    }

    /**
     * Fetch test data when clicked
     */
    async _fetchTestData(ev) {
        const record_id = parseInt(ev.currentTarget.dataset.index);
        this.state.currentRecordId = this.state.tests_confirm[record_id].id;

        const result = await this.orm.call(
            'lab.test.line',
            'action_get_patient_data',
            [this.state.currentRecordId]
        );

        this.state.tests_confirm_data = result;
        this.state.test_data = result['test_data'] || [];
        this._setActiveView('form');
    }

    /**
     * Confirm lab test
     */
    async confirmLabTest() {
        try {
            await this.orm.call(
                'lab.test.line',
                'create_lab_tests',
                [this.state.currentRecordId]
            );
            
            this.env.services.notification.add(
                _t('Le test a été confirmé avec succès'),
                { type: 'success' }
            );
            
            await this._loadTestData();
        } catch (error) {
            console.error('Error confirming test:', error);
            this.env.services.notification.add(
                _t('Erreur lors de la confirmation du test'),
                { type: 'danger' }
            );
        }
    }

    /**
     * Load all lab tests (in progress)
     */
    async _allLabTest() {
        this._setActiveView('process');
        const result = await this.orm.call('patient.lab.test', 'search_read', []);
        this.state.all_test_data = result;
    }

    /**
     * Fetch all test data and open form
     */
    async fetch_all_test_data(ev) {
        const record_id = parseInt(ev.currentTarget.dataset.index);
        await this._openTestForm(record_id);
    }

    /**
     * Open test form view
     */
    async _openTestForm(record_id) {
        return this.actionService.doAction({
            name: _t('Détails du Test'),
            type: 'ir.actions.act_window',
            res_model: 'patient.lab.test',
            res_id: record_id,
            views: [[false, "form"]],
        });
    }

    /**
     * Load published results
     */
    async _loadPublished() {
        this._setActiveView('published');
        
        try {
            const result = await this.orm.call('lab.test.result', 'print_test_results', []);
            this.state.published_data = result || [];
        } catch (error) {
            console.error('Error loading published results:', error);
            this.env.services.notification.add(
                _t('Erreur lors du chargement des résultats'),
                { type: 'warning' }
            );
        }
    }

    /**
     * Set active view and initialize charts if analytics
     */
    _setActiveView(view) {
        this.state.activeView = view;
        
        // Initialize charts when switching to analytics
        if (view === 'analytics') {
            setTimeout(() => {
                this.destroyCharts();
                this.initializeCharts();
            }, 100);
        }
    }
}

LabDashBoard.template = "LabDashboard";
registry.category("actions").add('lab_dashboard_tags', LabDashBoard);