var mongoose = require("mongoose");
var ObjectId = require("mongoose").Types.ObjectId;

var TaskSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please provide a valid task name."],
    },
    description: String,
    deadline: {
      type: Date,
      required: [true, "Please provide a valid deadline."],
      validate: (input) => input.getTime() && new Date(input) >= new Date(),
    },
    dateCreated: { type: Date, default: Date.now },
    completed: { type: Boolean, default: false },
    assignedUser: {
      type: String,
      default: "",
      validate: (input) => (input ? ObjectId.isValid(input) : true),
    },
    assignedUserName: { type: String, default: "unassigned" },
  },
  { collection: "tasks", versionKey: false }
);

module.exports = mongoose.model("Task", TaskSchema);
