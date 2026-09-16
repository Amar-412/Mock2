import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: [ true, "Username is required" ],
        unique: [ true, "Username must be unique" ]
    },
    email: {
        type: String,
        required: [ true, "Email is required" ],
        unique: [ true, "Email must be unique" ]
    },
    phone: {
        type: String,
        default: null,
        sparse: true
    },
    password: {
        type: String,
        required: [ true, "Password is required" ]
    },
    role: {
        type: String,
        enum: ["ADMIN", "STUDENT", "EVALUATOR"],
        default: "STUDENT"
    },
    collegeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "College",
        default: null
    },
    verified: {
        type: Boolean,
        default: false
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
})

const userModel = mongoose.model("users", userSchema)

export default userModel;