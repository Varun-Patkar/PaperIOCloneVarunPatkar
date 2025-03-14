import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '../../../../lib/mongodb';
import User from '../../../../models/User';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'paperio-secret-key';

export async function POST(request: NextRequest) {
	try {
		// Get token from cookies
		const token = request.cookies.get('paperio_auth_token')?.value;

		if (!token) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		// Verify token
		const decoded = jwt.verify(token, JWT_SECRET) as { sub: string };

		// Get score and color from request body
		const { score, color } = await request.json();

		// Connect to database
		await connectToDatabase();

		// Find the user
		const user = await User.findOne({ _id: decoded.sub });

		if (!user) {
			return NextResponse.json({ error: 'User not found' }, { status: 404 });
		}

		let updated = false;

		// Update personal best if score is provided and it's higher than current best
		if (typeof score === 'number' && score > user.personalBest) {
			user.personalBest = score;
			updated = true;
		}

		// Update preferred color if provided
		if (color && typeof color === 'string') {
			user.preferredColor = color;
			updated = true;
		}

		// Save changes if anything was updated
		if (updated) {
			user.updatedAt = new Date();
			await user.save();
		}

		return NextResponse.json({
			success: true,
			personalBest: user.personalBest,
			preferredColor: user.preferredColor
		});

	} catch (error) {
		console.error('Error updating user data:', error);
		return NextResponse.json({ error: 'Server error' }, { status: 500 });
	}
}