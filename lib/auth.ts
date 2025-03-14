import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import { connectToDatabase } from './mongodb';
import User from '../models/User';

const JWT_SECRET = process.env.JWT_SECRET || 'paperio-secret-key';

export async function getCurrentUser(request: NextRequest) {
	try {
		const token = request.cookies.get('paperio_auth_token')?.value;

		if (!token) {
			return null;
		}

		const decoded = jwt.verify(token, JWT_SECRET) as { sub: string };

		await connectToDatabase();
		const user = await User.findById(decoded.sub);

		if (!user) {
			return null;
		}

		return {
			id: user._id.toString(),
			username: user.username,
			name: user.name,
			avatarUrl: user.avatarUrl,
			personalBest: user.personalBest,
			preferredColor: user.preferredColor
		};
	} catch (error) {
		console.error('Auth error:', error);
		return null;
	}
}