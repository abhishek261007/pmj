const AuditLog = require('../models/AuditLog');

function parseDevice(ua) {
  if (!ua) return 'Unknown';
  if (ua.includes('Android')) return 'Android';
  if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
  if (ua.includes('Windows')) return 'Windows';
  if (ua.includes('Mac OS')) return 'macOS';
  if (ua.includes('Linux')) return 'Linux';
  return 'Unknown';
}

async function logAudit({ action, resource, resourceId, userId, userRole, details, ip, userAgent, headers }) {
  try {
    await AuditLog.create({
      action,
      resource,
      resourceId: resourceId || null,
      userId: userId || null,
      userRole: userRole || null,
      details: details || {},
      ip: ip || '',
      userAgent: userAgent || '',
      device: parseDevice(userAgent),
      deviceName: headers?.['x-device-name'] || '',
      deviceBrand: headers?.['x-device-brand'] || '',
      deviceModel: headers?.['x-device-model'] || '',
      deviceOS: headers?.['x-device-os']
        ? `${headers['x-device-os']} ${headers['x-device-os-version'] || ''}`.trim()
        : '',
    });
  } catch (err) {
    console.error('Audit log failed:', err);
  }
}

function auditMiddleware(action, resource) {
  return async (req, res, next) => {
    const originalJson = res.json.bind(res);
    res.json = async function (body) {
      if (res.statusCode < 400) {
        const resourceId = (action === 'create' && body?._id)
          ? body._id
          : req.params?.id || null;
        await logAudit({
          action,
          resource,
          resourceId,
          userId: req.user?.id || null,
          userRole: req.user?.role || null,
          details: { body: req.body, response: body },
          ip: req.ip,
          userAgent: req.headers['user-agent'],
          headers: req.headers,
        });
      }
      return originalJson(body);
    };
    next();
  };
}

module.exports = { logAudit, auditMiddleware };
