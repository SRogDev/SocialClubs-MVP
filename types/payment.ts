/**
 * Payment and financial types based on database.sql schema
 */

export interface Payment {
    id: string
    user_id: string | null
    amount: number
    txn_type: 'payment' | 'payout' | 'fee' | 'refund'
    txn_stripe_id: string | null
    status: 'pending' | 'completed' | 'failed'
    direction: 'in' | 'out'
    created_at: string
}

export interface ClubBalance {
    id: string
    user_id: string | null
    total_earnings: number
    available_balance: number
    updated_at: string
}

export interface ConnectedStripeAccount {
    id: number
    user_id: string | null
    stripe_account_id: string | null
    is_active: boolean
}

export enum TransactionType {
    PAYMENT = 'payment',
    PAYOUT = 'payout',
    FEE = 'fee',
    REFUND = 'refund',
}

export enum TransactionStatus {
    PENDING = 'pending',
    COMPLETED = 'completed',
    FAILED = 'failed',
}

export enum TransactionDirection {
    IN = 'in',
    OUT = 'out',
}
