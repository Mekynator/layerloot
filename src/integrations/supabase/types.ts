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
          category_id: string | null
          compare_at_price: number | null
          created_at: string
          description: string | null
          dimensions_cm: Json | null
          finish_type: string | null
          gift_finder_tag_id: string | null
          id: string
          images: string[] | null
          is_active: boolean
          is_featured: boolean
          material_type: string | null
          model_url: string | null
          name: string
          price: number
          print_time_hours: number | null
          slug: string
          stock: number
          updated_at: string
          weight_grams: number | null
        }
        Insert: {
          category_id?: string | null
          compare_at_price?: number | null
          created_at?: string
          description?: string | null
          dimensions_cm?: Json | null
          finish_type?: string | null
          gift_finder_tag_id?: string | null
          id?: string
          images?: string[] | null
          is_active?: boolean
          is_featured?: boolean
          material_type?: string | null
          model_url?: string | null
          name: string
          price?: number
          print_time_hours?: number | null
          slug: string
          stock?: number
          updated_at?: string
          weight_grams?: number | null
        }
        Update: {
          category_id?: string | null
          compare_at_price?: number | null
          created_at?: string
          description?: string | null
          dimensions_cm?: Json | null
          finish_type?: string | null
          gift_finder_tag_id?: string | null
          id?: string
          images?: string[] | null
          is_active?: boolean
          is_featured?: boolean
          material_type?: string | null
          model_url?: string | null
          name?: string
          price?: number
          print_time_hours?: number | null
          slug?: string
          stock?: number
          updated_at?: string
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
          shipping_address: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          shipping_address?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          shipping_address?: Json | null
          updated_at?: string
          user_id?: string
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
      site_blocks: {
        Row: {
          block_type: string
          content: Json
          created_at: string
          id: string
          is_active: boolean
          page: string
          sort_order: number
          title: string | null
          updated_at: string
        }
        Insert: {
          block_type: string
          content?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          page?: string
          sort_order?: number
          title?: string | null
          updated_at?: string
        }
        Update: {
          block_type?: string
          content?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          page?: string
          sort_order?: number
          title?: string | null
          updated_at?: string
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
          id: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
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
          code: string
          id: string
          is_used: boolean
          recipient_email: string | null
          recipient_name: string | null
          redeemed_at: string
          used_at: string | null
          user_id: string
          voucher_id: string
        }
        Insert: {
          balance?: number | null
          code: string
          id?: string
          is_used?: boolean
          recipient_email?: string | null
          recipient_name?: string | null
          redeemed_at?: string
          used_at?: string | null
          user_id: string
          voucher_id: string
        }
        Update: {
          balance?: number | null
          code?: string
          id?: string
          is_used?: boolean
          recipient_email?: string | null
          recipient_name?: string | null
          redeemed_at?: string
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
          created_at: string
          description: string | null
          discount_type: string
          discount_value: number
          id: string
          is_active: boolean
          name: string
          points_cost: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value: number
          id?: string
          is_active?: boolean
          name: string
          points_cost: number
        }
        Update: {
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value?: number
          id?: string
          is_active?: boolean
          name?: string
          points_cost?: number
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
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
