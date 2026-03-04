const express = require('express');
const { authenticateToken, authorizeRole } = require('../authMiddleware');
const alertService = require('../services/alertService');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

/**
 * GET /api/alerts - List all active alerts
 * Restricted to ADMIN and SUPERVISOR
 */
router.get('/', authorizeRole(['ADMIN', 'SUPERVISOR']), async (req, res) => {
  try {
    const alerts = await alertService.getActiveAlerts();
    res.json(alerts);
  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

/**
 * POST /api/alerts/:id/dismiss - Dismiss an alert
 * Restricted to ADMIN and SUPERVISOR
 */
router.post('/:id/dismiss', authorizeRole(['ADMIN', 'SUPERVISOR']), async (req, res) => {
  const { id } = req.params;
  try {
    const updatedAlert = await alertService.dismissAlert(id);
    res.json(updatedAlert);
  } catch (error) {
    console.error('Error dismissing alert:', error);
    res.status(500).json({ error: 'Failed to dismiss alert' });
  }
});

/**
 * POST /api/alerts/check - Manual trigger for inactivity check (maintenance)
 * Restricted to ADMIN
 */
router.post('/check', authorizeRole(['ADMIN']), async (req, res) => {
  try {
    await alertService.checkInactivityAlerts();
    res.json({ message: 'Inactivity check triggered successfully' });
  } catch (error) {
    console.error('Error triggering alert check:', error);
    res.status(500).json({ error: 'Failed to trigger alert check' });
  }
});

module.exports = router;
