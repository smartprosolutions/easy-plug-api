function success(res, data = {}, status = 200) {
  return res.status(status).json(Object.assign({ success: true }, data));
}

function fail(res, message = 'Request failed', status = 400, extra = {}) {
  return res.status(status).json(Object.assign({ success: false, message }, extra));
}

module.exports = { success, fail };
