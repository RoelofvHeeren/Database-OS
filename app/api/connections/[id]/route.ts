import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { encrypt } from '@/lib/encryption/crypto';

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    try {
        const body = await request.json();
        const { name, connectionUrl } = body;

        const updateData: any = {};
        if (name) updateData.name = name;
        if (connectionUrl) updateData.encryptedUrl = encrypt(connectionUrl);

        const connection = await prisma.connection.update({
            where: { id },
            data: updateData,
        });

        return NextResponse.json({
            id: connection.id,
            name: connection.name,
            createdAt: connection.createdAt,
        });
    } catch (error) {
        console.error('Failed to update connection:', error);
        return NextResponse.json(
            { error: 'Failed to update connection' },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    try {
        await prisma.connection.delete({
            where: { id },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to delete connection:', error);
        return NextResponse.json(
            { error: 'Failed to delete connection' },
            { status: 500 }
        );
    }
}
