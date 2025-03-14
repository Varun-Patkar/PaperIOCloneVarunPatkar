import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '../../../lib/mongodb';
import User from '../../../models/User';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'paperio-secret-key';

export async function GET(request: NextRequest) {
	try {
		// Get token from cookies
		const token = request.cookies.get('paperio_auth_token')?.value;

		if (!token) {
			return NextResponse.json({ isLoggedIn: false }, { status: 401 });
		}

		// Verify token
		const decoded = jwt.verify(token, JWT_SECRET) as { sub: string };

		// Connect to database
		await connectToDatabase();

		// Find user
		const user = await User.findById(decoded.sub).select('-__v');

		if (!user) {
			return NextResponse.json({ error: 'User not found' }, { status: 404 });
		}

		// Return user data (excluding sensitive info)
		return NextResponse.json({
			isLoggedIn: true,
			user: {
				id: user._id,
				username: user.username,
				name: user.name,
				avatarUrl: user.avatarUrl,
				personalBest: user.personalBest,
				preferredColor: user.preferredColor
			}
		});

	} catch (error) {
		console.error('Error getting user:', error);
		return NextResponse.json({ error: 'Authentication error' }, { status: 401 });
	}
}