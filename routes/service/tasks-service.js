const util = require("../util/util");
const TaskModel = require("../../models/task");
const userService = require("./users-service");
var ObjectId = require("mongoose").Types.ObjectId;

const getTaskByIds = async (ids) => {
  let where = '{"_id": {"$in": [ ' + '"' + ids.join('","') + '"' + "]}}";
  let query = TaskModel.find(!where ? JSON.parse("{}") : JSON.parse(where));
  const data = await query.exec();
  return data;
};

const validateTaskId = async (res, id, req) => {
  if (!ObjectId.isValid(id)) {
    let msg = "Invalid value provided for task id";
    util.badRequest(res, msg, "Task ID: " + id);
    return false;
  }

  try {
    const data = await TaskModel.findById(id);
    if (!data || Object.keys(data).length === 0) {
      let msg = "Task id does not exist : " + id;
      util.notFound(res, "Task Not Found", msg);
      return false;
    }

    if (req.body.assignedUser && data.completed === true) {
      let msg = "A completed task cannot be assigned to a user";
      util.badRequest(res, msg, "Task ID: " + id);
      return false;
    }
  } catch (error) {
    util.ise(res, "Failed to validate Task.", error.message);
    return false;
  }
  return true;
};

const validateCompletedTask = (res, body) => {
  if (!body) {
    let msg = "Please provide a valid request body.";
    util.badRequest(res, msg, "");
    return false;
  }
  if (body.completed && body.completed === true) {
    let msg = "A task cannot be created with a completed status true.";
    util.badRequest(res, msg, "completed: " + body.completed);
    return false;
  }
  return true;
};

const validateUserId = async (res, request) => {
  try {
    let copy = request;
    let assignedUser = request.assignedUser;
    let assignedUserName = request.assignedUserName;

    if (
      assignedUserName &&
      assignedUserName !== "unassigned" &&
      (!assignedUser || assignedUser === "")
    ) {
      let msg =
        "Missing attribute assignedUser. Please provide a valid assignedUser associated with the user name : " +
        assignedUserName;
      util.badRequest(res, msg, "User Name : " + assignedUserName);
      return null;
    }

    if (assignedUser && assignedUser !== "") {
      if (!ObjectId.isValid(assignedUser)) {
        let msg = "Invalid value provided for assignedUser.";
        util.badRequest(res, msg, "assignedUser: " + assignedUser);
        return null;
      }
      var data = await userService.getUserById(assignedUser);

      if (data.length == 0) {
        let msg =
          "User not found. Please provide a valid value for assignedUser.";
        util.badRequest(res, msg, "assignedUser: " + assignedUser);
        return null;
      }

      let userName = data[0].name;
      if (assignedUserName !== undefined) {
        if (userName !== request.assignedUserName) {
          let msg =
            "Invalid data provided. assignedUserName does not match with the user records. Expected assignedUserName : " +
            userName;
          util.badRequest(res, msg, "");
          return null;
        }
      } else {
        copy["assignedUserName"] = userName;
      }
    }
    return copy;
  } catch (error) {
    util.ise(res, "Failed to validate Task.", error.message);
    return null;
  }
};

const updatedTasksWithUserId = async (res, userId, userName, taskIds) => {
  let filter = JSON.parse(
    '{"_id": {"$in": [ ' + '"' + taskIds.join('","') + '"' + "]}}"
  );
  let update = JSON.parse(
    '{"assignedUser": "' + userId + '", "assignedUserName": "' + userName + '"}'
  );
  try {
    await TaskModel.updateMany(filter, update);
    return true;
  } catch (error) {
    util.ise(res, "Failed to update Tasks.", error.message);
    return false;
  }
};

const unsetUserFromTask = async (res, userId) => {
  let update = JSON.parse(
    '{"assignedUser": "' + "" + '", "assignedUserName": "' + "unassigned" + '"}'
  );
  try {
    await TaskModel.updateMany({ assignedUser: userId }, update);
    return true;
  } catch (error) {
    util.ise(res, "Failed to update Tasks.", error.message);
    return false;
  }
};

module.exports = {
  getTaskByIds: getTaskByIds,
  validateUserId: validateUserId,
  updatedTasksWithUserId: updatedTasksWithUserId,
  unsetUserFromTask: unsetUserFromTask,
  validateTaskId: validateTaskId,
  validateCompletedTask: validateCompletedTask,
};
