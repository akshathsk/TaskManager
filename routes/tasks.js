const util = require("./util/util");
const taskService = require("./service/tasks-service");
const userService = require("./service/users-service");
const TaskModel = require("../models/task");

module.exports = (router) => {
  router.route("/tasks").post(async (req, res) => {
    if (!taskService.validateCompletedTask(res, req.body)) {
      return;
    }

    let updatedRequest = await taskService.validateUserId(res, req.body);
    if (updatedRequest === null) {
      return;
    }

    const data = new TaskModel({
      name: updatedRequest.name,
      description: updatedRequest.description,
      deadline: updatedRequest.deadline,
      completed: updatedRequest.completed,
      assignedUser: updatedRequest.assignedUser,
      assignedUserName: updatedRequest.assignedUserName,
    });
    try {
      const dataToSave = await data.save();

      if (
        req.body.assignedUser &&
        req.body.assignedUser !== "" &&
        (!req.body.completed || req.body.completed === false)
      ) {
        let pushTaskToAssignedUserStatus =
          await userService.pushTaskToAssignedUser(
            res,
            dataToSave.assignedUser,
            dataToSave._id
          );
        if (!pushTaskToAssignedUserStatus) {
          return;
        }
      }
      util.created(res, "Task has been created", dataToSave);
    } catch (error) {
      util.badRequest(res, error.message, {});
    }
  });

  router.route("/tasks").get(async (req, res) => {
    try {
      const finalQuery = util.getQuery(req.query, TaskModel);
      const data = await finalQuery.exec();
      util.success(res, data);
    } catch (error) {
      util.ise(res, "Failed to get Tasks", error.message);
    }
  });

  router.route("/tasks/:id").get(async (req, res) => {
    try {
      const finalQuery = util.getQueryById(req.params.id, req.query, TaskModel);
      const data = await finalQuery.exec();
      util.validateAndRespondSuccess(
        res,
        "Task Not Found. Task ID: " + req.params.id,
        data
      );
    } catch (error) {
      util.badRequest(res, error.message, { _id: req.params.id });
    }
  });

  router.route("/tasks/:id").put(async (req, res) => {
    try {
      const id = req.params.id;
      var validationStatus = await taskService.validateTaskId(res, id, req);
      if (!validationStatus) {
        return;
      }

      let updatedData = await taskService.validateUserId(res, req.body);
      if (updatedData === null) {
        return;
      }

      var oldTask = await TaskModel.findById(id);
      var unsetTaskFromUser = false;
      if (
        (req.body.assignedUser !== undefined && req.body.assignedUser == "") ||
        (req.body.assignedUserName !== undefined &&
          req.body.assignedUserName == "unassigned")
      ) {
        updatedData["assignedUser"] = "";
        updatedData["assignedUserName"] = "unassigned";
        unsetTaskFromUser = true;
      }

      const options = { new: true };
      const result = await TaskModel.findByIdAndUpdate(
        id,
        updatedData,
        options
      );

      if (
        !unsetTaskFromUser &&
        req.body.assignedUser &&
        req.body.assignedUser !== oldTask.assignedUser &&
        oldTask.assignedUser !== ""
      ) {
        let removeCompletedTasksFromUserStatus =
          await userService.removeCompletedTasksFromUser(
            res,
            oldTask.assignedUser,
            id
          );
        if (!removeCompletedTasksFromUserStatus) {
          return;
        }
      }

      if (req.body.assignedUser && req.body.assignedUser !== "") {
        let pushTaskToAssignedUserStatus =
          await userService.pushTaskToAssignedUser(
            res,
            result.assignedUser,
            result._id
          );
        if (!pushTaskToAssignedUserStatus) {
          return;
        }
      }

      if (
        req.body.completed !== undefined &&
        req.body.completed === true &&
        result.assignedUser !== ""
      ) {
        let removeCompletedTasksFromUserStatus =
          await userService.removeCompletedTasksFromUser(
            res,
            result.assignedUser,
            result._id
          );
        if (!removeCompletedTasksFromUserStatus) {
          return;
        }
      }

      if (unsetTaskFromUser && oldTask.assignedUser !== "") {
        let removeCompletedTasksFromUserStatus =
          await userService.removeCompletedTasksFromUser(
            res,
            oldTask.assignedUser,
            id
          );
        if (!removeCompletedTasksFromUserStatus) {
          return;
        }
      }

      util.success(res, result);
    } catch (error) {
      util.badRequest(res, error.message, { _id: req.params.id });
    }
  });

  router.route("/tasks/:id").delete(async (req, res) => {
    try {
      const id = req.params.id;
      const data = await TaskModel.findByIdAndDelete(id);

      userService.deletePendingTaskFromUser(res, null, [id]);
      let message = !data
        ? null
        : `Task with name < ${data.name} > has been deleted`;
      util.validateAndRespondSuccess(
        res,
        "Task Not Found. Task Id : " + id,
        message
      );
    } catch (error) {
      util.badRequest(res, error.message, { _id: req.params.id });
    }
  });

  return router;
};
