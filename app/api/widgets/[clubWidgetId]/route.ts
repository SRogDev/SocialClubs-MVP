import { NextRequest, NextResponse } from 'next/server'
import { getClubWidgetData } from '@/services/widgetService'

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ clubWidgetId: string }> }
) {
    const { clubWidgetId } = await params

    if (!clubWidgetId) {
        return NextResponse.json({ error: 'Missing clubWidgetId' }, { status: 400 })
    }

    const data = await getClubWidgetData(clubWidgetId)

    if (!data) {
        return NextResponse.json({ error: 'Widget not found' }, { status: 404 })
    }

    return NextResponse.json(data)
}
