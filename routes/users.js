const util = require("./util/util");
const userService = require("./service/users-service");
const taskService = require("./service/tasks-service");
const UserModel = require("../models/user");

module.exports = (router) => {
  router.route("/users").post(async (req, res) => {
    if (req.body.pendingTasks) {
      var validatePendingTasksStatus = await userService.validatePendingTasks(
        res,
        req.body.pendingTasks
      );
      if (!validatePendingTasksStatus) {
        return;
      }
    }
    const data = new UserModel({
      name: req.body.name,
      email: req.body.email,
      pendingTasks: req.body.pendingTasks,
    });
    try {
      if (req.body.pendingTasks && req.body.pendingTasks.length > 0) {
        var deletePendingTaskFromUserStatus =
          await userService.deletePendingTaskFromUser(
            res,
            null,
            req.body.pendingTasks
          );
        if (!deletePendingTaskFromUserStatus) {
          return;
        }
      }
      const dataToSave = await data.save();
      if (req.body.pendingTasks && req.body.pendingTasks.length > 0) {
        await taskService.updatedTasksWithUserId(
          res,
          data._id,
          data.name,
          req.body.pendingTasks
        );
      }
      util.created(res, "User has been created", dataToSave);
    } catch (error) {
      util.badRequest(res, error.message, "");
    }
  });

  router.route("/users").get(async (req, res) => {
    try {
      const finalQuery = util.getQuery(req.query, UserModel);
      const data = await finalQuery.exec();
      util.success(res, data);
    } catch (error) {
      util.ise(res, "Failed to get Users", error.message);
    }
  });

  router.route("/users/:id").get(async (req, res) => {
    try {
      const finalQuery = util.getQueryById(req.params.id, req.query, UserModel);
      const data = await finalQuery.exec();
      util.validateAndRespondSuccess(
        res,
        "User Not Found. User ID: " + req.params.id,
        data
      );
    } catch (error) {
      util.badRequest(res, error.message, "User ID: " + req.params.id);
    }
  });

  router.route("/users/:id").put(async (req, res) => {
    try {
      const id = req.params.id;

      var validationStatus = await userService.validateUserId(res, id);
      if (!validationStatus) {
        return;
      }

      if (req.body.email && !userService.validateEmail(res, req.body.email)) {
        return;
      }

      if (req.body.pendingTasks) {
        var validatePendingTasksStatus = await userService.validatePendingTasks(
          res,
          req.body.pendingTasks instanceof Array
            ? req.body.pendingTasks
            : [req.body.pendingTasks]
        );
        if (!validatePendingTasksStatus) {
          return;
        }
      }

      const updatedData = req.body;

      if (req.body.pendingTasks && req.body.pendingTasks.length > 0) {
        var deletePendingTaskFromUserStatus =
          await userService.deletePendingTaskFromUser(
            res,
            id,
            req.body.pendingTasks instanceof Array
              ? req.body.pendingTasks
              : [req.body.pendingTasks]
          );
        if (!deletePendingTaskFromUserStatus) {
          return;
        }
      }
      const options = { new: true };
      const result = await UserModel.findByIdAndUpdate(
        id,
        updatedData,
        options
      );

      if (
        ((req.body.pendingTasks && req.body.pendingTasks.length > 0) ||
          (req.body.name && req.body.name.length > 0)) &&
        result.pendingTasks.length > 0
      ) {
        var updatedTasksWithUserIdStatus =
          await taskService.updatedTasksWithUserId(
            res,
            result._id,
            result.name,
            result.pendingTasks
          );
        if (!updatedTasksWithUserIdStatus) {
          return;
        }
      }

      if (req.body.pendingTasks && req.body.pendingTasks.length == 0) {
        var unsetUserFromTaskStatus = await taskService.unsetUserFromTask(
          res,
          result._id
        );
        if (!unsetUserFromTaskStatus) {
          return;
        }
      }

      util.success(res, result);
    } catch (error) {
      util.badRequest(res, error.message, "User ID: " + req.params.id);
    }
  });

  router.route("/users/:id").delete(async (req, res) => {
    try {
      const id = req.params.id;
      const data = await UserModel.findByIdAndDelete(id);

      if (data && data.pendingTasks && data.pendingTasks.length > 0) {
        var updatedTasksWithUserIdStatus =
          await taskService.updatedTasksWithUserId(
            res,
            "",
            "unassigned",
            data.pendingTasks
          );
        if (!updatedTasksWithUserIdStatus) {
          return;
        }
      }

      let message = !data
        ? null
        : `User with name < ${data.name} > has been deleted`;
      util.validateAndRespondSuccess(
        res,
        "User Not Found. User Id : " + id,
        message
      );
    } catch (error) {
      util.badRequest(res, error.message, "User ID: " + req.params.id);
    }
  });

  return router;
};
