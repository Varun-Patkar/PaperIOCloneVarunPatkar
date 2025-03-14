import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '../../../../../lib/mongodb';
import User from '../../../../../models/User';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'paperio-secret-key';

export async function GET(request: NextRequest) {
	// Get code and state from query params
	const searchParams = request.nextUrl.searchParams;
	const code = searchParams.get('code');
	const state = searchParams.get('state');

	// Verify state matches what we sent
	const storedState = request.cookies.get('github_oauth_state')?.value;
	if (!state || !storedState || state !== storedState) {
		return NextResponse.redirect(new URL('/auth-error?error=invalid_state', request.url));
	}

	if (!code) {
		return NextResponse.redirect(new URL('/auth-error?error=no_code', request.url));
	}

	try {
		// Exchange code for access token
		const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Accept': 'application/json'
			},
			body: JSON.stringify({
				client_id: process.env.GITHUB_CLIENT_ID,
				client_secret: process.env.GITHUB_CLIENT_SECRET,
				code,
				redirect_uri: `${process.env.NEXT_PUBLIC_API_URL || ''}/api/auth/github/callback`
			})
		});

		const tokenData = await tokenResponse.json();

		if (!tokenData.access_token) {
			return NextResponse.redirect(new URL('/auth-error?error=token_error', request.url));
		}

		// Get user data from GitHub
		const userResponse = await fetch('https://api.github.com/user', {
			headers: {
				'Authorization': `Bearer ${tokenData.access_token}`
			}
		});

		const userData = await userResponse.json();

		// Get user emails if they are available
		const emailsResponse = await fetch('https://api.github.com/user/emails', {
			headers: {
				'Authorization': `Bearer ${tokenData.access_token}`
			}
		});

		const emails = await emailsResponse.json();
		const primaryEmail = emails.find((email: any) => email.primary)?.email || emails[0]?.email;

		// Connect to database
		await connectToDatabase();

		// Find or create user
		let user = await User.findOne({ githubId: userData.id.toString() });

		if (!user) {
			user = await User.create({
				githubId: userData.id.toString(),
				username: userData.login,
				name: userData.name || userData.login,
				email: primaryEmail,
				avatarUrl: userData.avatar_url,
				personalBest: 0,
				preferredColor: '#ff0000'
			});
		} else {
			// Update user information
			user.username = userData.login;
			user.name = userData.name || userData.login;
			user.email = primaryEmail;
			user.avatarUrl = userData.avatar_url;
			user.updatedAt = new Date();
			await user.save();
		}

		// Create JWT token
		const token = jwt.sign(
			{
				sub: user._id.toString(),
				githubId: user.githubId,
				username: user.username
			},
			JWT_SECRET,
			{ expiresIn: '7d' }
		);

		// Create JWT cookie
		const response = NextResponse.redirect(new URL('/', request.url));
		response.cookies.set('paperio_auth_token', token, {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'lax',
			maxAge: 60 * 60 * 24 * 7, // 7 days
			path: '/'
		});

		return response;

	} catch (error) {
		console.error('GitHub OAuth error:', error);
		return NextResponse.redirect(new URL('/auth-error?error=server_error', request.url));
	}
}