import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
	const clientId = process.env.GITHUB_CLIENT_ID;
	if (!clientId) {
		return NextResponse.json({ error: 'GitHub Client ID not configured' }, { status: 500 });
	}

	// Generate random state for CSRF protection
	const state = Math.random().toString(36).substring(2);

	// Store state in a cookie
	const cookieOptions = {
		httpOnly: true,
		maxAge: 60 * 10, // 10 minutes
		path: '/',
		secure: process.env.NODE_ENV === 'production',
		sameSite: 'lax' as const
	};

	// Redirect to GitHub OAuth
	const url = new URL('https://github.com/login/oauth/authorize');
	url.searchParams.append('client_id', clientId);
	url.searchParams.append('scope', 'read:user user:email');
	url.searchParams.append('state', state);
	url.searchParams.append('redirect_uri', `${process.env.NEXT_PUBLIC_API_URL || ''}/api/auth/github/callback`);

	const response = NextResponse.redirect(url);
	response.cookies.set('github_oauth_state', state, cookieOptions);

	return response;
}