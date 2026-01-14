import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { encrypt } from '@/lib/encryption/crypto';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { name, connectionUrl } = body;

        if (!name || !connectionUrl) {
            return NextResponse.json(
                { error: 'Name and connection URL are required' },
                { status: 400 }
            );
        }

        // Encrypt the connection string
        const encryptedUrl = encrypt(connectionUrl);

        // Create connection
        const connection = await prisma.connection.create({
            data: {
                name,
                encryptedUrl,
            },
        });

        return NextResponse.json({
            id: connection.id,
            name: connection.name,
            createdAt: connection.createdAt,
        });
    } catch (error) {
        console.error('Failed to create connection:', error);
        return NextResponse.json(
            { error: 'Failed to create connection' },
            { status: 500 }
        );
    }
}

export async function GET() {
    try {
        const connections = await prisma.connection.findMany({
            select: {
                id: true,
                name: true,
                createdAt: true,
                updatedAt: true,
            },
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json(connections);
    } catch (error) {
        console.error('Failed to fetch connections:', error);
        return NextResponse.json(
            { error: 'Failed to fetch connections' },
            { status: 500 }
        );
    }
}
