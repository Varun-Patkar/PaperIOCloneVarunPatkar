import mongoose, { Schema, Model, Document } from 'mongoose';

export interface IUser {
	githubId: string;
	username: string;
	name?: string;
	email?: string;
	avatarUrl?: string;
	personalBest: number;
	preferredColor: string;
	createdAt: Date;
	updatedAt: Date;
}

export interface IUserDocument extends IUser, Document { }

const UserSchema = new Schema<IUserDocument>({
	githubId: { type: String, required: true, unique: true },
	username: { type: String, required: true },
	name: { type: String },
	email: { type: String },
	avatarUrl: { type: String },
	personalBest: { type: Number, default: 0 },
	preferredColor: { type: String, default: '#ff0000' },
	createdAt: { type: Date, default: Date.now },
	updatedAt: { type: Date, default: Date.now },
});

// Use this approach to properly type your model
const User = (mongoose.models.User || mongoose.model<IUserDocument>('User', UserSchema)) as Model<IUserDocument>;

export default User;