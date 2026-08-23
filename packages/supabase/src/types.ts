export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          preferred_temp_unit: "celsius" | "fahrenheit";
          preferred_weight_unit: "grams" | "oz";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          preferred_temp_unit?: "celsius" | "fahrenheit";
          preferred_weight_unit?: "grams" | "oz";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          display_name?: string | null;
          preferred_temp_unit?: "celsius" | "fahrenheit";
          preferred_weight_unit?: "grams" | "oz";
          updated_at?: string;
        };
      };
      equipment: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          brand: string;
          model: string;
          sub_type: string | null;
          setting_scale_type: string | null;
          is_favorite: boolean;
          notes: string | null;
          created_at: string;
        };
      };
      beans: {
        Row: {
          id: string;
          user_id: string;
          roaster: string;
          name: string;
          origin_country: string;
          region: string | null;
          farm: string | null;
          variety: string[] | null;
          altitude_meters: number | null;
          process: string;
          roast_level: string;
          roast_date: string;
          flavor_notes: string[];
          rating: number | null;
          bag_weight_grams: number | null;
          remaining_grams: number | null;
          price: number | null;
          is_favorite: boolean;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
      };
      recipes: {
        Row: {
          id: string;
          user_id: string | null;
          name: string;
          brew_method: string;
          recommended_brewer_id: string | null;
          recommended_grinder_id: string | null;
          description: string;
          author: string | null;
          coffee_dose_grams: number;
          water_amount_grams: number;
          ratio: number;
          grind_size: string;
          water_temp_celsius: number;
          total_time_seconds: number;
          is_preset: boolean;
          is_favorite: boolean;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
      };
      recipe_stages: {
        Row: {
          id: string;
          recipe_id: string;
          step_order: number;
          name: string;
          start_second: number;
          duration_seconds: number;
          target_water_weight_grams: number;
          instruction: string;
          stage_type: string;
        };
      };
      tasting_logs: {
        Row: {
          id: string;
          user_id: string;
          bean_id: string | null;
          recipe_id: string | null;
          grinder_id: string | null;
          brewer_id: string | null;
          grinder_snapshot: string | null;
          brewer_snapshot: string | null;
          bean_name_snapshot: string;
          roaster_snapshot: string;
          recipe_name_snapshot: string;
          brew_method: string;
          brew_date: string;
          coffee_dose_grams: number;
          water_amount_grams: number;
          actual_time_seconds: number;
          grind_setting: string;
          water_temp_celsius: number;
          fragrance_aroma: number;
          acidity: number;
          sweetness: number;
          body: number;
          clarity: number;
          aftertaste: number;
          balance: number;
          overall: number;
          calculated_sca_score: number;
          rating: number;
          flavor_tags: string[];
          notes: string;
          would_brew_again: boolean;
          created_at: string;
        };
      };
    };
  };
}
