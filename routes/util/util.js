const TaskModel = require("../../models/task");
const UserModel = require("../../models/user");

function getQuery(queryParams, Model) {
  const { where, sort, select, skip, limit, count } = queryParams;
  var query = Model.find(!where ? JSON.parse("{}") : JSON.parse(where))
    .sort(!sort ? JSON.parse("{}") : JSON.parse(sort))
    .select(!select ? JSON.parse("{}") : JSON.parse(select))
    .skip(!skip ? null : parseInt(skip, 10))
    .limit(getLimit(Model, limit, count));
  const finalQuery = !count ? query : query.countDocuments(count);
  return finalQuery;
}

//test this
function getLimit(Model, limit, count) {
  if (Model === UserModel) {
    return !limit ? null : parseInt(limit, 10);
  } else if (Model === TaskModel) {
    if (count && !limit) {
      return null;
    }
    return !limit ? 100 : parseInt(limit, 10);
  }
}

function getQueryById(id, queryParams, Model) {
  const { select } = queryParams;
  var query = Model.findById(id).select(
    !select ? JSON.parse("{}") : JSON.parse(select)
  );
  return query;
}

function created(res, msg, data) {
  res
    .location("/api/users/" + data._id)
    .status(201)
    .json({ message: msg, data: data });
}

function success(res, data) {
  res.status(200).json({ message: "OK", data: data });
}

function notFound(res, msg, data) {
  res.status(404).json({ message: msg, data: data });
}

function validateAndRespondSuccess(res, msg, data) {
  if (!data) {
    res.status(404).json({ message: msg, data: "Data not found." });
  } else {
    res.status(200).json({ message: "OK", data: data });
  }
}

function badRequest(res, message, data) {
  if (message.includes("timed out after")) {
    ise(res, data, message);
    return;
  }

  let msg = message;
  if (message.includes("Cast to ObjectId failed for value")) {
    msg = "Invalid id provided in get request";
  } else if (message.includes("Please provide a valid email")) {
    msg = "Please provide a valid email";
  } else if (message.includes("User validation failed: email")) {
    msg = "Please provide a valid email";
  } else if (message.includes("Please provide a valid name")) {
    msg = "Please provide a valid name";
  } else if (message.includes("Task validation failed: deadline")) {
    msg = "Please provide a valid deadline. Deadline cannot be in the past.";
  } else if (message.includes("Please provide a valid task name")) {
    msg = "Please provide a valid task name";
  } else if (message.includes("Please provide a valid deadline")) {
    msg = "Please provide a valid deadline";
  } else if (message.includes("duplicate key error collection")) {
    msg =
      "Email already exists in the system. Please provide a unique email id.";
  }
  res.status(400).json({ message: msg, data: data });
}

function ise(res, message, data) {
  console.log(data);
  let msg = "Something went wrong. Please try again later.";
  if (data.includes("Cast to ObjectId failed for value")) {
    msg = "Invalid id provided in get request";
  }
  res.status(500).json({ message: msg, data: message });
}

module.exports = {
  getQuery: getQuery,
  getQueryById: getQueryById,
  created: created,
  success: success,
  validateAndRespondSuccess: validateAndRespondSuccess,
  ise: ise,
  badRequest: badRequest,
  notFound: notFound,
};
