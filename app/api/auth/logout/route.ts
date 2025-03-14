import { NextResponse } from 'next/server';

export async function POST() {
	const response = NextResponse.json({ success: true });

	// Clear the auth cookie
	response.cookies.set('paperio_auth_token', '', {
		expires: new Date(0),
		path: '/',
	});

	return response;
}