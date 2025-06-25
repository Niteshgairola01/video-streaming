import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const videoSchema = new Schema({
    videoFile: {
        type: String,
        required: true
    },
    title: {
        type: String,
        required: true
    },
    desctiption: {
        type: String,
        required: true
    },
    thumbnail: {
        type: String
    },
    views: [
        {
            type: Schema.Types.ObjectId,
            ref: "View"
        }
    ],
    owner: {
        type: Schema.Types.ObjectId,
        ref: "User"
    },
    duration: {
        type: Number,
        required: true,
        default: 0
    },
    isPublished: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

videoSchema.plugin(mongooseAggregatePaginate);

export const Video = mongoose.model("Vidoe", videoSchema);