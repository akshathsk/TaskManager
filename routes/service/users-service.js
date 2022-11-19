const util = require("../util/util");
const taskService = require("./tasks-service");
const UserModel = require("../../models/user");
var ObjectId = require("mongoose").Types.ObjectId;

const validateEmail = (res, input) => {
  if (!/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(input)) {
    let msg = "Please provide a valid email";
    util.badRequest(res, msg, { email: input });
    return false;
  }
  return true;
};

const validateUserId = async (res, id) => {
  if (!ObjectId.isValid(id)) {
    let msg = "Invalid value provided for user id";
    util.badRequest(res, msg, { _id: id });
    return false;
  }

  try {
    const data = await UserModel.findById(id);
    if (!data || Object.keys(data).length === 0) {
      let msg = "User id does not exist : " + id;
      util.notFound(res, "User Not Found", msg);
      return false;
    }
  } catch (error) {
    util.ise(res, "Failed to validate User.", error.message);
    return false;
  }
  return true;
};

const validatePendingTasks = async (res, pendingTasksFromRequest) => {
  try {
    if (pendingTasksFromRequest && pendingTasksFromRequest.length != 0) {
      var invalidRequestIds = [];
      pendingTasksFromRequest.forEach((task) => {
        if (!ObjectId.isValid(task)) {
          invalidRequestIds.push(task);
        }
      });
      if (invalidRequestIds.length > 0) {
        let msg = "Invalid values provided for pendingTask";
        util.badRequest(res, msg, { pendingTasks: invalidRequestIds });
        return false;
      }

      var pendingTasksFromDb = await taskService.getTaskByIds(
        pendingTasksFromRequest
      );
      if (pendingTasksFromDb.length != pendingTasksFromRequest.length) {
        let msg =
          "Pending task array contains invalid or duplicate entries. Please check if the task exists.";
        util.badRequest(res, msg, { pendingTasks: pendingTasksFromRequest });
        return false;
      }
      var invalidIds = [];
      pendingTasksFromDb.forEach((element) => {
        if (element.completed) {
          invalidIds.push(element._id);
        }
      });
      if (invalidIds.length > 0) {
        let msg = "Completed tasks cannot be assigned to a user.";
        util.badRequest(res, msg, { pendingTasks: invalidIds });
        return false;
      }
    }
    return true;
  } catch (error) {
    util.ise(res, "Failed to validate User.", error.message);
    return false;
  }
};

const getRemovedIds = (res, pendingTasksFromRequest, userDataOld) => {
  try {
    const stringsArray = userDataOld.pendingTasks.map((x) => x.toString());
    const diffArr = stringsArray.filter(
      (o) => !pendingTasksFromRequest.includes(o)
    );
    return diffArr;
  } catch (error) {
    util.ise(res, "Failed to update User.", error.message);
    return null;
  }
};

const getUserById = async (id) => {
  let where = '{"_id": {"$in": [ ' + '"' + id + '"' + "]}}";
  let query = UserModel.find(!where ? JSON.parse("{}") : JSON.parse(where));
  const data = await query.exec();
  return data;
};

const removeCompletedTasksFromUser = async (res, assignedUserId, taskId) => {
  try {
    const data = await util.getQueryById(assignedUserId, {}, UserModel);
    var pendingTasks = data.pendingTasks;
    const index = pendingTasks.indexOf(taskId);
    if (index > -1) {
      pendingTasks.splice(index, 1);
    }
    await UserModel.findByIdAndUpdate(
      assignedUserId,
      { pendingTasks: pendingTasks },
      { new: true }
    );
    return true;
  } catch (error) {
    util.ise(res, "Failed to update User.", error.message);
    return false;
  }
};

const deletePendingTaskFromUser = async (res, assignedUserId, taskIds) => {
  try {
    let filter = !assignedUserId
      ? {
          pendingTasks: { $in: [...taskIds] },
        }
      : {
          pendingTasks: { $in: [...taskIds] },
          _id: {
            $ne: assignedUserId,
          },
        };

    await UserModel.updateMany(filter, {
      $pullAll: { pendingTasks: [...taskIds] },
    });
    return true;
  } catch (error) {
    util.ise(res, "Failed to update Users.", error.message);
    return false;
  }
};

const pushTaskToAssignedUser = async (res, assignedUserId, taskId) => {
  try {
    await UserModel.updateMany(
      { _id: assignedUserId, pendingTasks: { $ne: taskId } },
      { $push: { pendingTasks: taskId } }
    );
    return true;
  } catch (error) {
    util.ise(res, error.message);
    return false;
  }
};

exports.validatePendingTasks = validatePendingTasks;
exports.getUserById = getUserById;
exports.removeCompletedTasksFromUser = removeCompletedTasksFromUser;
exports.deletePendingTaskFromUser = deletePendingTaskFromUser;
exports.validateUserId = validateUserId;
exports.pushTaskToAssignedUser = pushTaskToAssignedUser;
exports.validateEmail = validateEmail;
exports.getRemovedIds = getRemovedIds;
