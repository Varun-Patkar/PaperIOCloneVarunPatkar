import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/paperio';

// Cache the MongoDB connection to reuse it across API calls
let cachedConnection: typeof mongoose | null = null;

export async function connectToDatabase() {
	if (cachedConnection) {
		return cachedConnection;
	}

	try {
		const connection = await mongoose.connect(MONGODB_URI);
		cachedConnection = connection;
		console.log('Connected to MongoDB');
		return connection;
	} catch (error) {
		console.error('Failed to connect to MongoDB:', error);
		throw new Error('Could not connect to database');
	}
}