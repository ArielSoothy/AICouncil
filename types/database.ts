export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          created_at: string
          subscription_tier: 'free' | 'pro' | 'enterprise'
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          subscription_tier?: 'free' | 'pro' | 'enterprise'
        }
        Update: {
          email?: string
          subscription_tier?: 'free' | 'pro' | 'enterprise'
        }
      }
      conversations: {
        Row: {
          id: string
          user_id: string
          query: string
          responses: any // JSONB type
          evaluation_data?: any // JSONB type for structured evaluation data
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          query: string
          responses: any
          evaluation_data?: any
        }
        Update: {
          query?: string
          responses?: any
          evaluation_data?: any
        }
      }
      feedback: {
        Row: {
          id: string
          conversation_id: string
          user_rating: number | null
          comments: string | null
          created_at: string
        }
        Insert: {
          conversation_id: string
          user_rating?: number | null
          comments?: string | null
        }
        Update: {
          user_rating?: number | null
          comments?: string | null
        }
      }
    }
  }
}