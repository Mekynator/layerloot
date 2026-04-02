export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      admin_activity_log: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          metadata: Json | null
          summary: string | null
          user_email: string | null
          user_id: string
          user_role: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json | null
          summary?: string | null
          user_email?: string | null
          user_id: string
          user_role?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json | null
          summary?: string | null
          user_email?: string | null
          user_id?: string
          user_role?: string | null
        }
        Relationships: []
      }
      admin_internal_notes: {
        Row: {
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          is_pinned: boolean
          note: string
          user_id: string
        }
        Insert: {
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          is_pinned?: boolean
          note: string
          user_id: string
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          is_pinned?: boolean
          note?: string
          user_id?: string
        }
        Relationships: []
      }
      admin_permissions: {
        Row: {
          created_at: string
          id: string
          permission: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          created_at?: string
          id?: string
          permission: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          created_at?: string
          id?: string
          permission?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: []
      }
      ai_translations: {
        Row: {
          content_id: string
          content_type: string
          created_at: string
          field_name: string
          id: string
          source_hash: string
          source_lang: string
          source_text: string
          target_lang: string
          translated_text: string
          updated_at: string
        }
        Insert: {
          content_id: string
          content_type: string
          created_at?: string
          field_name: string
          id?: string
          source_hash: string
          source_lang?: string
          source_text: string
          target_lang: string
          translated_text: string
          updated_at?: string
        }
        Update: {
          content_id?: string
          content_type?: string
          created_at?: string
          field_name?: string
          id?: string
          source_hash?: string
          source_lang?: string
          source_text?: string
          target_lang?: string
          translated_text?: string
          updated_at?: string
        }
        Relationships: []
      }
      automation_logs: {
        Row: {
          actions_executed: Json
          created_at: string
          id: string
          page: string | null
          session_id: string
          trigger_event: string
          user_id: string | null
          workflow_id: string
        }
        Insert: {
          actions_executed?: Json
          created_at?: string
          id?: string
          page?: string | null
          session_id: string
          trigger_event: string
          user_id?: string | null
          workflow_id: string
        }
        Update: {
          actions_executed?: Json
          created_at?: string
          id?: string
          page?: string | null
          session_id?: string
          trigger_event?: string
          user_id?: string | null
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_logs_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "automation_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_workflows: {
        Row: {
          actions: Json
          campaign_id: string | null
          conditions: Json
          cooldown_seconds: number
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          max_fires_per_session: number
          name: string
          priority: number
          trigger_config: Json
          trigger_event: string
          updated_at: string
        }
        Insert: {
          actions?: Json
          campaign_id?: string | null
          conditions?: Json
          cooldown_seconds?: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          max_fires_per_session?: number
          name: string
          priority?: number
          trigger_config?: Json
          trigger_event: string
          updated_at?: string
        }
        Update: {
          actions?: Json
          campaign_id?: string | null
          conditions?: Json
          cooldown_seconds?: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          max_fires_per_session?: number
          name?: string
          priority?: number
          trigger_config?: Json
          trigger_event?: string
          updated_at?: string
        }
        Relationships: []
      }
      campaigns: {
        Row: {
          banner_config: Json
          campaign_type: string
          chat_overrides: Json
          created_at: string
          created_by: string | null
          description: string | null
          effects: Json
          end_date: string | null
          id: string
          is_recurring: boolean
          name: string
          priority: number
          start_date: string | null
          status: string
          theme_overrides: Json
          updated_at: string
        }
        Insert: {
          banner_config?: Json
          campaign_type?: string
          chat_overrides?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          effects?: Json
          end_date?: string | null
          id?: string
          is_recurring?: boolean
          name: string
          priority?: number
          start_date?: string | null
          status?: string
          theme_overrides?: Json
          updated_at?: string
        }
        Update: {
          banner_config?: Json
          campaign_type?: string
          chat_overrides?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          effects?: Json
          end_date?: string | null
          id?: string
          is_recurring?: boolean
          name?: string
          priority?: number
          start_date?: string | null
          status?: string
          theme_overrides?: Json
          updated_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          icon_name: string | null
          id: string
          image_url: string | null
          name: string
          parent_id: string | null
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon_name?: string | null
          id?: string
          image_url?: string | null
          name: string
          parent_id?: string | null
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          icon_name?: string | null
          id?: string
          image_url?: string | null
          name?: string
          parent_id?: string | null
          slug?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_analytics_events: {
        Row: {
          campaign_id: string | null
          created_at: string
          event_data: Json
          event_type: string
          id: string
          page: string | null
          session_id: string
          user_id: string | null
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string
          event_data?: Json
          event_type: string
          id?: string
          page?: string | null
          session_id: string
          user_id?: string | null
        }
        Update: {
          campaign_id?: string | null
          created_at?: string
          event_data?: Json
          event_type?: string
          id?: string
          page?: string | null
          session_id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      chat_conversations: {
        Row: {
          admin_flags: Json
          campaign_id: string | null
          created_at: string
          ended_at: string | null
          id: string
          language: string | null
          message_count: number
          messages: Json
          metadata: Json
          outcome: string
          page: string | null
          session_id: string
          started_at: string
          user_id: string | null
        }
        Insert: {
          admin_flags?: Json
          campaign_id?: string | null
          created_at?: string
          ended_at?: string | null
          id?: string
          language?: string | null
          message_count?: number
          messages?: Json
          metadata?: Json
          outcome?: string
          page?: string | null
          session_id: string
          started_at?: string
          user_id?: string | null
        }
        Update: {
          admin_flags?: Json
          campaign_id?: string | null
          created_at?: string
          ended_at?: string | null
          id?: string
          language?: string | null
          message_count?: number
          messages?: Json
          metadata?: Json
          outcome?: string
          page?: string | null
          session_id?: string
          started_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      chat_knowledge_base: {
        Row: {
          answer: string
          category: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          keywords: string[] | null
          media_url: string | null
          priority: number
          question: string
          tags: string[] | null
          title: string | null
          updated_at: string
        }
        Insert: {
          answer: string
          category?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          keywords?: string[] | null
          media_url?: string | null
          priority?: number
          question: string
          tags?: string[] | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          answer?: string
          category?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          keywords?: string[] | null
          media_url?: string | null
          priority?: number
          question?: string
          tags?: string[] | null
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      chat_optimization_snapshots: {
        Row: {
          applied: boolean | null
          avg_engagement_score: number | null
          conversion_rate: number | null
          created_at: string
          id: string
          period_end: string
          period_start: string
          suggested_adjustments: Json | null
          top_performing_responses: Json | null
          total_messages: number | null
          total_sessions: number | null
          weak_responses: Json | null
        }
        Insert: {
          applied?: boolean | null
          avg_engagement_score?: number | null
          conversion_rate?: number | null
          created_at?: string
          id?: string
          period_end: string
          period_start: string
          suggested_adjustments?: Json | null
          top_performing_responses?: Json | null
          total_messages?: number | null
          total_sessions?: number | null
          weak_responses?: Json | null
        }
        Update: {
          applied?: boolean | null
          avg_engagement_score?: number | null
          conversion_rate?: number | null
          created_at?: string
          id?: string
          period_end?: string
          period_start?: string
          suggested_adjustments?: Json | null
          top_performing_responses?: Json | null
          total_messages?: number | null
          total_sessions?: number | null
          weak_responses?: Json | null
        }
        Relationships: []
      }
      chat_response_feedback: {
        Row: {
          conversation_id: string | null
          created_at: string
          engagement_score: number | null
          feedback_type: string
          follow_up_count: number | null
          id: string
          led_to_conversion: boolean | null
          message_index: number
          page: string | null
          preset_used: string | null
          rating: string
          response_snippet: string | null
          session_id: string
          tone_used: string | null
          user_id: string | null
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string
          engagement_score?: number | null
          feedback_type?: string
          follow_up_count?: number | null
          id?: string
          led_to_conversion?: boolean | null
          message_index?: number
          page?: string | null
          preset_used?: string | null
          rating?: string
          response_snippet?: string | null
          session_id: string
          tone_used?: string | null
          user_id?: string | null
        }
        Update: {
          conversation_id?: string | null
          created_at?: string
          engagement_score?: number | null
          feedback_type?: string
          follow_up_count?: number | null
          id?: string
          led_to_conversion?: boolean | null
          message_index?: number
          page?: string | null
          preset_used?: string | null
          rating?: string
          response_snippet?: string | null
          session_id?: string
          tone_used?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_response_feedback_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      content_revisions: {
        Row: {
          action: string
          change_summary: string | null
          content_id: string
          content_type: string
          created_at: string
          created_by: string | null
          id: string
          page: string | null
          restored_from_revision_id: string | null
          revision_data: Json
          revision_number: number
        }
        Insert: {
          action?: string
          change_summary?: string | null
          content_id: string
          content_type: string
          created_at?: string
          created_by?: string | null
          id?: string
          page?: string | null
          restored_from_revision_id?: string | null
          revision_data: Json
          revision_number?: number
        }
        Update: {
          action?: string
          change_summary?: string | null
          content_id?: string
          content_type?: string
          created_at?: string
          created_by?: string | null
          id?: string
          page?: string | null
          restored_from_revision_id?: string | null
          revision_data?: Json
          revision_number?: number
        }
        Relationships: []
      }
      creator_submissions: {
        Row: {
          admin_notes: string | null
          created_at: string
          creator_name: string
          description: string
          email: string
          id: string
          model_filename: string
          model_url: string
          portfolio_url: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          creator_name: string
          description: string
          email: string
          id?: string
          model_filename: string
          model_url: string
          portfolio_url?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          creator_name?: string
          description?: string
          email?: string
          id?: string
          model_filename?: string
          model_url?: string
          portfolio_url?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      custom_order_messages: {
        Row: {
          created_at: string
          custom_order_id: string
          id: string
          message: string | null
          message_type: string
          proposed_price: number | null
          sender_role: string
          sender_user_id: string | null
        }
        Insert: {
          created_at?: string
          custom_order_id: string
          id?: string
          message?: string | null
          message_type?: string
          proposed_price?: number | null
          sender_role?: string
          sender_user_id?: string | null
        }
        Update: {
          created_at?: string
          custom_order_id?: string
          id?: string
          message?: string | null
          message_type?: string
          proposed_price?: number | null
          sender_role?: string
          sender_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "custom_order_messages_custom_order_id_fkey"
            columns: ["custom_order_id"]
            isOneToOne: false
            referencedRelation: "custom_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_order_showcases: {
        Row: {
          admin_notes_for_reproduction: string | null
          approved_by_admin: boolean
          category: string | null
          colors: string | null
          created_at: string
          currency: string
          custom_order_id: string | null
          description: string | null
          dimensions: string | null
          featured: boolean
          final_price: number | null
          finished_image_urls: string[] | null
          id: string
          materials: string | null
          owner_user_id: string
          preview_image_urls: string[] | null
          production_settings_json: Json | null
          quoted_price: number | null
          rating_avg: number | null
          rating_count: number
          reorder_count: number
          reorder_enabled: boolean
          size_notes: string | null
          slug: string
          source_model_filename: string | null
          source_model_url: string | null
          tags: string[] | null
          thumbnail_url: string | null
          title: string
          updated_at: string
          visibility_status: string
        }
        Insert: {
          admin_notes_for_reproduction?: string | null
          approved_by_admin?: boolean
          category?: string | null
          colors?: string | null
          created_at?: string
          currency?: string
          custom_order_id?: string | null
          description?: string | null
          dimensions?: string | null
          featured?: boolean
          final_price?: number | null
          finished_image_urls?: string[] | null
          id?: string
          materials?: string | null
          owner_user_id: string
          preview_image_urls?: string[] | null
          production_settings_json?: Json | null
          quoted_price?: number | null
          rating_avg?: number | null
          rating_count?: number
          reorder_count?: number
          reorder_enabled?: boolean
          size_notes?: string | null
          slug: string
          source_model_filename?: string | null
          source_model_url?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          visibility_status?: string
        }
        Update: {
          admin_notes_for_reproduction?: string | null
          approved_by_admin?: boolean
          category?: string | null
          colors?: string | null
          created_at?: string
          currency?: string
          custom_order_id?: string | null
          description?: string | null
          dimensions?: string | null
          featured?: boolean
          final_price?: number | null
          finished_image_urls?: string[] | null
          id?: string
          materials?: string | null
          owner_user_id?: string
          preview_image_urls?: string[] | null
          production_settings_json?: Json | null
          quoted_price?: number | null
          rating_avg?: number | null
          rating_count?: number
          reorder_count?: number
          reorder_enabled?: boolean
          size_notes?: string | null
          slug?: string
          source_model_filename?: string | null
          source_model_url?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          visibility_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_order_showcases_custom_order_id_fkey"
            columns: ["custom_order_id"]
            isOneToOne: false
            referencedRelation: "custom_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_orders: {
        Row: {
          admin_notes: string | null
          created_at: string
          customer_offer_price: number | null
          customer_response_status: string
          description: string
          email: string
          final_agreed_price: number | null
          id: string
          metadata: Json
          model_filename: string
          model_url: string
          name: string
          payment_status: string
          production_status: string
          quoted_price: number | null
          request_fee_amount: number
          request_fee_status: string
          status: string
          stripe_checkout_session_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          customer_offer_price?: number | null
          customer_response_status?: string
          description: string
          email: string
          final_agreed_price?: number | null
          id?: string
          metadata?: Json
          model_filename: string
          model_url: string
          name: string
          payment_status?: string
          production_status?: string
          quoted_price?: number | null
          request_fee_amount?: number
          request_fee_status?: string
          status?: string
          stripe_checkout_session_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          customer_offer_price?: number | null
          customer_response_status?: string
          description?: string
          email?: string
          final_agreed_price?: number | null
          id?: string
          metadata?: Json
          model_filename?: string
          model_url?: string
          name?: string
          payment_status?: string
          production_status?: string
          quoted_price?: number | null
          request_fee_amount?: number
          request_fee_status?: string
          status?: string
          stripe_checkout_session_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      discount_codes: {
        Row: {
          code: string
          created_at: string
          description: string | null
          discount_type: string
          discount_value: number
          expires_at: string | null
          id: string
          is_active: boolean
          is_stackable: boolean
          max_uses: number | null
          min_order_amount: number | null
          min_quantity: number | null
          scope: string
          scope_target_id: string | null
          scope_target_user_id: string | null
          starts_at: string | null
          updated_at: string
          used_count: number
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          is_stackable?: boolean
          max_uses?: number | null
          min_order_amount?: number | null
          min_quantity?: number | null
          scope?: string
          scope_target_id?: string | null
          scope_target_user_id?: string | null
          starts_at?: string | null
          updated_at?: string
          used_count?: number
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          is_stackable?: boolean
          max_uses?: number | null
          min_order_amount?: number | null
          min_quantity?: number | null
          scope?: string
          scope_target_id?: string | null
          scope_target_user_id?: string | null
          starts_at?: string | null
          updated_at?: string
          used_count?: number
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      gallery_posts: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          image_url: string
          is_approved: boolean
          product_id: string | null
          product_name: string
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          image_url: string
          is_approved?: boolean
          product_id?: string | null
          product_name: string
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          image_url?: string
          is_approved?: boolean
          product_id?: string | null
          product_name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gallery_posts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      gift_finder_tags: {
        Row: {
          created_at: string
          icon_key: string | null
          id: string
          is_active: boolean
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          icon_key?: string | null
          id?: string
          is_active?: boolean
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          icon_key?: string | null
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      loyalty_points: {
        Row: {
          created_at: string
          id: string
          order_id: string | null
          points: number
          reason: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          order_id?: string | null
          points?: number
          reason: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string | null
          points?: number
          reason?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_points_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      media_asset_versions: {
        Row: {
          asset_id: string
          created_at: string
          file_size_bytes: number | null
          id: string
          public_url: string
          replaced_by: string | null
          storage_path: string
          version_number: number
        }
        Insert: {
          asset_id: string
          created_at?: string
          file_size_bytes?: number | null
          id?: string
          public_url: string
          replaced_by?: string | null
          storage_path: string
          version_number?: number
        }
        Update: {
          asset_id?: string
          created_at?: string
          file_size_bytes?: number | null
          id?: string
          public_url?: string
          replaced_by?: string | null
          storage_path?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "media_asset_versions_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      media_assets: {
        Row: {
          alt_text: string | null
          created_at: string
          description: string | null
          file_name: string
          file_size_bytes: number | null
          folder: string
          height: number | null
          id: string
          is_archived: boolean
          media_type: string
          mime_type: string
          original_name: string
          public_url: string
          storage_bucket: string
          storage_path: string
          tags: string[] | null
          title: string | null
          updated_at: string
          uploaded_by: string | null
          usage_count: number
          width: number | null
        }
        Insert: {
          alt_text?: string | null
          created_at?: string
          description?: string | null
          file_name: string
          file_size_bytes?: number | null
          folder?: string
          height?: number | null
          id?: string
          is_archived?: boolean
          media_type?: string
          mime_type?: string
          original_name: string
          public_url: string
          storage_bucket?: string
          storage_path: string
          tags?: string[] | null
          title?: string | null
          updated_at?: string
          uploaded_by?: string | null
          usage_count?: number
          width?: number | null
        }
        Update: {
          alt_text?: string | null
          created_at?: string
          description?: string | null
          file_name?: string
          file_size_bytes?: number | null
          folder?: string
          height?: number | null
          id?: string
          is_archived?: boolean
          media_type?: string
          mime_type?: string
          original_name?: string
          public_url?: string
          storage_bucket?: string
          storage_path?: string
          tags?: string[] | null
          title?: string | null
          updated_at?: string
          uploaded_by?: string | null
          usage_count?: number
          width?: number | null
        }
        Relationships: []
      }
      newsletter_subscribers: {
        Row: {
          created_at: string
          email: string
          id: string
          is_active: boolean
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          is_active?: boolean
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          is_active?: boolean
        }
        Relationships: []
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          product_id: string | null
          product_name: string
          quantity: number
          total_price: number
          unit_price: number
        }
        Insert: {
          id?: string
          order_id: string
          product_id?: string | null
          product_name: string
          quantity?: number
          total_price?: number
          unit_price?: number
        }
        Update: {
          id?: string
          order_id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_history: {
        Row: {
          created_at: string
          id: string
          note: string | null
          order_id: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          note?: string | null
          order_id: string
          status: string
        }
        Update: {
          created_at?: string
          id?: string
          note?: string | null
          order_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          discount_metadata: Json | null
          id: string
          notes: string | null
          shipping_address: Json | null
          shipping_cost: number
          status: string
          subtotal: number
          tool_type: string | null
          total: number
          tracking_number: string | null
          tracking_url: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          discount_metadata?: Json | null
          id?: string
          notes?: string | null
          shipping_address?: Json | null
          shipping_cost?: number
          status?: string
          subtotal?: number
          tool_type?: string | null
          total?: number
          tracking_number?: string | null
          tracking_url?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          discount_metadata?: Json | null
          id?: string
          notes?: string | null
          shipping_address?: Json | null
          shipping_cost?: number
          status?: string
          subtotal?: number
          tool_type?: string | null
          total?: number
          tracking_number?: string | null
          tracking_url?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      price_calculations: {
        Row: {
          admin_user_id: string
          created_at: string
          custom_order_id: string | null
          electricity_cost: number
          failure_buffer: number
          final_price: number | null
          finishing_difficulty: string
          id: string
          machine_wear_factor: number
          margin_percentage: number
          material_cost_per_kg: number
          notes: string | null
          object_weight_grams: number
          packaging_cost: number
          print_time_hours: number
          product_id: string | null
          production_cost: number
          suggested_price: number
        }
        Insert: {
          admin_user_id: string
          created_at?: string
          custom_order_id?: string | null
          electricity_cost?: number
          failure_buffer?: number
          final_price?: number | null
          finishing_difficulty?: string
          id?: string
          machine_wear_factor?: number
          margin_percentage?: number
          material_cost_per_kg?: number
          notes?: string | null
          object_weight_grams?: number
          packaging_cost?: number
          print_time_hours?: number
          product_id?: string | null
          production_cost?: number
          suggested_price?: number
        }
        Update: {
          admin_user_id?: string
          created_at?: string
          custom_order_id?: string | null
          electricity_cost?: number
          failure_buffer?: number
          final_price?: number | null
          finishing_difficulty?: string
          id?: string
          machine_wear_factor?: number
          margin_percentage?: number
          material_cost_per_kg?: number
          notes?: string | null
          object_weight_grams?: number
          packaging_cost?: number
          print_time_hours?: number
          product_id?: string | null
          production_cost?: number
          suggested_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "price_calculations_custom_order_id_fkey"
            columns: ["custom_order_id"]
            isOneToOne: false
            referencedRelation: "custom_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_calculations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_categories: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          parent_id: string | null
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          parent_id?: string | null
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          parent_id?: string | null
          slug?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      product_gift_finder_tags: {
        Row: {
          created_at: string
          gift_finder_tag_id: string
          product_id: string
        }
        Insert: {
          created_at?: string
          gift_finder_tag_id: string
          product_id: string
        }
        Update: {
          created_at?: string
          gift_finder_tag_id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_gift_finder_tags_gift_finder_tag_id_fkey"
            columns: ["gift_finder_tag_id"]
            isOneToOne: false
            referencedRelation: "gift_finder_tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_gift_finder_tags_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_questions: {
        Row: {
          answer: string | null
          answered_at: string | null
          answered_by: string | null
          created_at: string
          id: string
          is_public: boolean
          product_id: string
          question: string
          status: string
          user_id: string
        }
        Insert: {
          answer?: string | null
          answered_at?: string | null
          answered_by?: string | null
          created_at?: string
          id?: string
          is_public?: boolean
          product_id: string
          question: string
          status?: string
          user_id: string
        }
        Update: {
          answer?: string | null
          answered_at?: string | null
          answered_by?: string | null
          created_at?: string
          id?: string
          is_public?: boolean
          product_id?: string
          question?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_questions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          is_approved: boolean
          product_id: string
          rating: number
          title: string | null
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          is_approved?: boolean
          product_id: string
          rating: number
          title?: string | null
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          is_approved?: boolean
          product_id?: string
          rating?: number
          title?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          attributes: Json
          created_at: string
          id: string
          is_active: boolean
          name: string
          price: number
          product_id: string
          sku: string | null
          sort_order: number
          stock: number
        }
        Insert: {
          attributes?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          price?: number
          product_id: string
          sku?: string | null
          sort_order?: number
          stock?: number
        }
        Update: {
          attributes?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          price?: number
          product_id?: string
          sku?: string | null
          sort_order?: number
          stock?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          archived_at: string | null
          category_id: string | null
          compare_at_price: number | null
          created_at: string
          description: string | null
          dimensions_cm: Json | null
          draft_data: Json | null
          finish_type: string | null
          gift_finder_tag_id: string | null
          has_draft: boolean
          id: string
          images: string[] | null
          is_active: boolean
          is_featured: boolean
          material_type: string | null
          model_url: string | null
          name: string
          price: number
          print_time_hours: number | null
          published_at: string | null
          published_by: string | null
          scheduled_publish_at: string | null
          slug: string
          status: string
          stock: number
          updated_at: string
          updated_by: string | null
          weight_grams: number | null
        }
        Insert: {
          archived_at?: string | null
          category_id?: string | null
          compare_at_price?: number | null
          created_at?: string
          description?: string | null
          dimensions_cm?: Json | null
          draft_data?: Json | null
          finish_type?: string | null
          gift_finder_tag_id?: string | null
          has_draft?: boolean
          id?: string
          images?: string[] | null
          is_active?: boolean
          is_featured?: boolean
          material_type?: string | null
          model_url?: string | null
          name: string
          price?: number
          print_time_hours?: number | null
          published_at?: string | null
          published_by?: string | null
          scheduled_publish_at?: string | null
          slug: string
          status?: string
          stock?: number
          updated_at?: string
          updated_by?: string | null
          weight_grams?: number | null
        }
        Update: {
          archived_at?: string | null
          category_id?: string | null
          compare_at_price?: number | null
          created_at?: string
          description?: string | null
          dimensions_cm?: Json | null
          draft_data?: Json | null
          finish_type?: string | null
          gift_finder_tag_id?: string | null
          has_draft?: boolean
          id?: string
          images?: string[] | null
          is_active?: boolean
          is_featured?: boolean
          material_type?: string | null
          model_url?: string | null
          name?: string
          price?: number
          print_time_hours?: number | null
          published_at?: string | null
          published_by?: string | null
          scheduled_publish_at?: string | null
          slug?: string
          status?: string
          stock?: number
          updated_at?: string
          updated_by?: string | null
          weight_grams?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_gift_finder_tag_id_fkey"
            columns: ["gift_finder_tag_id"]
            isOneToOne: false
            referencedRelation: "gift_finder_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          language: string | null
          shipping_address: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          language?: string | null
          shipping_address?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          language?: string | null
          shipping_address?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reusable_blocks: {
        Row: {
          block_type: string
          content: Json
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_archived: boolean
          name: string
          tags: string[] | null
          thumbnail_url: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          block_type: string
          content?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_archived?: boolean
          name: string
          tags?: string[] | null
          thumbnail_url?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          block_type?: string
          content?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_archived?: boolean
          name?: string
          tags?: string[] | null
          thumbnail_url?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      shipping_config: {
        Row: {
          flat_rate: number
          free_shipping_threshold: number
          id: string
          updated_at: string
        }
        Insert: {
          flat_rate?: number
          free_shipping_threshold?: number
          id?: string
          updated_at?: string
        }
        Update: {
          flat_rate?: number
          free_shipping_threshold?: number
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      shipping_providers: {
        Row: {
          base_cost: number
          cost_per_kg: number
          created_at: string
          description: string | null
          estimated_days: string | null
          free_threshold: number | null
          id: string
          is_active: boolean
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          base_cost?: number
          cost_per_kg?: number
          created_at?: string
          description?: string | null
          estimated_days?: string | null
          free_threshold?: number | null
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          base_cost?: number
          cost_per_kg?: number
          created_at?: string
          description?: string | null
          estimated_days?: string | null
          free_threshold?: number | null
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      showcase_favorites: {
        Row: {
          created_at: string
          id: string
          showcase_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          showcase_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          showcase_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "showcase_favorites_showcase_id_fkey"
            columns: ["showcase_id"]
            isOneToOne: false
            referencedRelation: "custom_order_showcases"
            referencedColumns: ["id"]
          },
        ]
      }
      showcase_reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          rating: number
          showcase_id: string
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          rating: number
          showcase_id: string
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          rating?: number
          showcase_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "showcase_reviews_showcase_id_fkey"
            columns: ["showcase_id"]
            isOneToOne: false
            referencedRelation: "custom_order_showcases"
            referencedColumns: ["id"]
          },
        ]
      }
      site_blocks: {
        Row: {
          block_type: string
          content: Json
          created_at: string
          draft_content: Json | null
          has_draft: boolean
          id: string
          is_active: boolean
          page: string
          published_at: string | null
          published_by: string | null
          scheduled_publish_at: string | null
          sort_order: number
          title: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          block_type: string
          content?: Json
          created_at?: string
          draft_content?: Json | null
          has_draft?: boolean
          id?: string
          is_active?: boolean
          page?: string
          published_at?: string | null
          published_by?: string | null
          scheduled_publish_at?: string | null
          sort_order?: number
          title?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          block_type?: string
          content?: Json
          created_at?: string
          draft_content?: Json | null
          has_draft?: boolean
          id?: string
          is_active?: boolean
          page?: string
          published_at?: string | null
          published_by?: string | null
          scheduled_publish_at?: string | null
          sort_order?: number
          title?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      site_pages: {
        Row: {
          created_at: string
          full_path: string
          id: string
          is_home: boolean
          is_published: boolean
          is_system: boolean
          name: string
          page_type: string
          parent_id: string | null
          seo_description: string | null
          seo_title: string | null
          show_in_footer: boolean
          show_in_header: boolean
          slug: string
          sort_order: number
          title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_path: string
          id?: string
          is_home?: boolean
          is_published?: boolean
          is_system?: boolean
          name: string
          page_type?: string
          parent_id?: string | null
          seo_description?: string | null
          seo_title?: string | null
          show_in_footer?: boolean
          show_in_header?: boolean
          slug: string
          sort_order?: number
          title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_path?: string
          id?: string
          is_home?: boolean
          is_published?: boolean
          is_system?: boolean
          name?: string
          page_type?: string
          parent_id?: string | null
          seo_description?: string | null
          seo_title?: string | null
          show_in_footer?: boolean
          show_in_header?: boolean
          slug?: string
          sort_order?: number
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_pages_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "site_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      site_settings: {
        Row: {
          draft_value: Json | null
          has_draft: boolean
          id: string
          key: string
          published_at: string | null
          published_by: string | null
          scheduled_publish_at: string | null
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          draft_value?: Json | null
          has_draft?: boolean
          id?: string
          key: string
          published_at?: string | null
          published_by?: string | null
          scheduled_publish_at?: string | null
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          draft_value?: Json | null
          has_draft?: boolean
          id?: string
          key?: string
          published_at?: string | null
          published_by?: string | null
          scheduled_publish_at?: string | null
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      translation_entries: {
        Row: {
          created_at: string
          draft_value: string | null
          has_draft: boolean
          id: string
          is_published: boolean
          key: string
          locale: string
          namespace: string
          published_at: string | null
          published_by: string | null
          source_hash: string | null
          status: string
          updated_at: string
          updated_by: string | null
          value: string
        }
        Insert: {
          created_at?: string
          draft_value?: string | null
          has_draft?: boolean
          id?: string
          is_published?: boolean
          key: string
          locale: string
          namespace?: string
          published_at?: string | null
          published_by?: string | null
          source_hash?: string | null
          status?: string
          updated_at?: string
          updated_by?: string | null
          value?: string
        }
        Update: {
          created_at?: string
          draft_value?: string | null
          has_draft?: boolean
          id?: string
          is_published?: boolean
          key?: string
          locale?: string
          namespace?: string
          published_at?: string | null
          published_by?: string | null
          source_hash?: string | null
          status?: string
          updated_at?: string
          updated_by?: string | null
          value?: string
        }
        Relationships: []
      }
      user_gift_notifications: {
        Row: {
          claimed_at: string | null
          created_at: string
          gift_message: string | null
          gift_status: string
          id: string
          is_read: boolean
          message: string | null
          recipient_user_id: string | null
          sender_name: string | null
          sender_user_id: string | null
          title: string
          updated_at: string
          user_id: string
          user_voucher_id: string
        }
        Insert: {
          claimed_at?: string | null
          created_at?: string
          gift_message?: string | null
          gift_status?: string
          id?: string
          is_read?: boolean
          message?: string | null
          recipient_user_id?: string | null
          sender_name?: string | null
          sender_user_id?: string | null
          title?: string
          updated_at?: string
          user_id: string
          user_voucher_id: string
        }
        Update: {
          claimed_at?: string | null
          created_at?: string
          gift_message?: string | null
          gift_status?: string
          id?: string
          is_read?: boolean
          message?: string | null
          recipient_user_id?: string | null
          sender_name?: string | null
          sender_user_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          user_voucher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_gift_notifications_user_voucher_id_fkey"
            columns: ["user_voucher_id"]
            isOneToOne: false
            referencedRelation: "user_vouchers"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_vouchers: {
        Row: {
          balance: number | null
          claimed_at: string | null
          code: string
          gift_message: string | null
          gift_status: string | null
          gifted_at: string | null
          id: string
          is_used: boolean
          recipient_email: string | null
          recipient_name: string | null
          recipient_user_id: string | null
          redeemed_at: string
          sender_email: string | null
          sender_name: string | null
          sender_user_id: string | null
          used_at: string | null
          user_id: string
          voucher_id: string
        }
        Insert: {
          balance?: number | null
          claimed_at?: string | null
          code: string
          gift_message?: string | null
          gift_status?: string | null
          gifted_at?: string | null
          id?: string
          is_used?: boolean
          recipient_email?: string | null
          recipient_name?: string | null
          recipient_user_id?: string | null
          redeemed_at?: string
          sender_email?: string | null
          sender_name?: string | null
          sender_user_id?: string | null
          used_at?: string | null
          user_id: string
          voucher_id: string
        }
        Update: {
          balance?: number | null
          claimed_at?: string | null
          code?: string
          gift_message?: string | null
          gift_status?: string | null
          gifted_at?: string | null
          id?: string
          is_used?: boolean
          recipient_email?: string | null
          recipient_name?: string | null
          recipient_user_id?: string | null
          redeemed_at?: string
          sender_email?: string | null
          sender_name?: string | null
          sender_user_id?: string | null
          used_at?: string | null
          user_id?: string
          voucher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_vouchers_voucher_id_fkey"
            columns: ["voucher_id"]
            isOneToOne: false
            referencedRelation: "vouchers"
            referencedColumns: ["id"]
          },
        ]
      }
      vouchers: {
        Row: {
          badge_text: string | null
          created_at: string
          description: string | null
          discount_type: string
          discount_value: number
          expiry_days: number | null
          global_usage_limit: number | null
          icon_key: string | null
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          points_cost: number
          reward_type: string | null
          sort_order: number | null
          usage_limit_per_user: number | null
        }
        Insert: {
          badge_text?: string | null
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value: number
          expiry_days?: number | null
          global_usage_limit?: number | null
          icon_key?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          points_cost: number
          reward_type?: string | null
          sort_order?: number | null
          usage_limit_per_user?: number | null
        }
        Update: {
          badge_text?: string | null
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value?: number
          expiry_days?: number | null
          global_usage_limit?: number | null
          icon_key?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          points_cost?: number
          reward_type?: string | null
          sort_order?: number | null
          usage_limit_per_user?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_custom_order: {
        Args: { _order_email: string; _order_user_id: string }
        Returns: boolean
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      get_user_points_balance: { Args: { _user_id: string }; Returns: number }
      has_permission: {
        Args: { _permission: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "user" | "super_admin" | "editor" | "support"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user", "super_admin", "editor", "support"],
    },
  },
} as const
