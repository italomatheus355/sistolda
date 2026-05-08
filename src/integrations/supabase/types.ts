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
      chaves: {
        Row: {
          codigo: string
          created_at: string
          departamento: string | null
          id: string
          militar_responsavel: string | null
          nome: string
          numero: number
          status: string
          updated_at: string
        }
        Insert: {
          codigo: string
          created_at?: string
          departamento?: string | null
          id?: string
          militar_responsavel?: string | null
          nome: string
          numero: number
          status?: string
          updated_at?: string
        }
        Update: {
          codigo?: string
          created_at?: string
          departamento?: string | null
          id?: string
          militar_responsavel?: string | null
          nome?: string
          numero?: number
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      escala_cabos: {
        Row: {
          blocos: Json
          cabo_id: number
          cabo_nome: string
          created_at: string
          data: string
          id: string
          updated_at: string
        }
        Insert: {
          blocos?: Json
          cabo_id: number
          cabo_nome: string
          created_at?: string
          data: string
          id?: string
          updated_at?: string
        }
        Update: {
          blocos?: Json
          cabo_id?: number
          cabo_nome?: string
          created_at?: string
          data?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      historico_chaves: {
        Row: {
          cabo_devolucao: string | null
          cabo_retirada: string | null
          chave_id: string
          chave_nome: string
          created_at: string
          data_devolucao: string | null
          data_retirada: string
          id: string
          matricula: string | null
          militar: string
          status: string
        }
        Insert: {
          cabo_devolucao?: string | null
          cabo_retirada?: string | null
          chave_id: string
          chave_nome: string
          created_at?: string
          data_devolucao?: string | null
          data_retirada?: string
          id?: string
          matricula?: string | null
          militar: string
          status?: string
        }
        Update: {
          cabo_devolucao?: string | null
          cabo_retirada?: string | null
          chave_id?: string
          chave_nome?: string
          created_at?: string
          data_devolucao?: string | null
          data_retirada?: string
          id?: string
          matricula?: string | null
          militar?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "historico_chaves_chave_id_fkey"
            columns: ["chave_id"]
            isOneToOne: false
            referencedRelation: "chaves"
            referencedColumns: ["id"]
          },
        ]
      }
      historico_materiais: {
        Row: {
          cabo_retorno: string | null
          cabo_saida: string | null
          created_at: string
          data_retorno: string | null
          data_saida: string
          id: string
          material_id: string
          material_nome: string
          matricula: string | null
          militar: string
          status: string
        }
        Insert: {
          cabo_retorno?: string | null
          cabo_saida?: string | null
          created_at?: string
          data_retorno?: string | null
          data_saida?: string
          id?: string
          material_id: string
          material_nome: string
          matricula?: string | null
          militar: string
          status?: string
        }
        Update: {
          cabo_retorno?: string | null
          cabo_saida?: string | null
          created_at?: string
          data_retorno?: string | null
          data_saida?: string
          id?: string
          material_id?: string
          material_nome?: string
          matricula?: string | null
          militar?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "historico_materiais_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materiais"
            referencedColumns: ["id"]
          },
        ]
      }
      historico_viaturas: {
        Row: {
          autonomia_informada: string | null
          cabo_retorno: string | null
          cabo_saida: string | null
          created_at: string
          data_retorno: string | null
          data_saida: string
          destino: string
          id: string
          km_retorno: number | null
          km_rodado: number | null
          km_saida: number | null
          matricula: string | null
          motorista: string
          status: string
          viatura_id: string
          viatura_prefixo: string
        }
        Insert: {
          autonomia_informada?: string | null
          cabo_retorno?: string | null
          cabo_saida?: string | null
          created_at?: string
          data_retorno?: string | null
          data_saida?: string
          destino: string
          id?: string
          km_retorno?: number | null
          km_rodado?: number | null
          km_saida?: number | null
          matricula?: string | null
          motorista: string
          status?: string
          viatura_id: string
          viatura_prefixo: string
        }
        Update: {
          autonomia_informada?: string | null
          cabo_retorno?: string | null
          cabo_saida?: string | null
          created_at?: string
          data_retorno?: string | null
          data_saida?: string
          destino?: string
          id?: string
          km_retorno?: number | null
          km_rodado?: number | null
          km_saida?: number | null
          matricula?: string | null
          motorista?: string
          status?: string
          viatura_id?: string
          viatura_prefixo?: string
        }
        Relationships: [
          {
            foreignKeyName: "historico_viaturas_viatura_id_fkey"
            columns: ["viatura_id"]
            isOneToOne: false
            referencedRelation: "viaturas"
            referencedColumns: ["id"]
          },
        ]
      }
      materiais: {
        Row: {
          created_at: string
          descricao: string | null
          id: string
          militar_responsavel: string | null
          nome: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          id?: string
          militar_responsavel?: string | null
          nome: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          descricao?: string | null
          id?: string
          militar_responsavel?: string | null
          nome?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          matricula: string | null
          nome: string
          posto_grad: string | null
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          matricula?: string | null
          nome: string
          posto_grad?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          matricula?: string | null
          nome?: string
          posto_grad?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
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
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      viaturas: {
        Row: {
          created_at: string
          id: string
          km_atual: number | null
          militar_responsavel: string | null
          modelo: string
          numero: number
          placa: string | null
          prefixo: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          km_atual?: number | null
          militar_responsavel?: string | null
          modelo: string
          numero: number
          placa?: string | null
          prefixo: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          km_atual?: number | null
          militar_responsavel?: string | null
          modelo?: string
          numero?: number
          placa?: string | null
          prefixo?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      visitantes: {
        Row: {
          cabo_registro: string | null
          created_at: string
          documento: string
          hora_entrada: string
          hora_saida: string | null
          id: string
          local_destino: string
          militar_responsavel: string
          nome: string
          observacoes: string | null
        }
        Insert: {
          cabo_registro?: string | null
          created_at?: string
          documento: string
          hora_entrada?: string
          hora_saida?: string | null
          id?: string
          local_destino: string
          militar_responsavel: string
          nome: string
          observacoes?: string | null
        }
        Update: {
          cabo_registro?: string | null
          created_at?: string
          documento?: string
          hora_entrada?: string
          hora_saida?: string | null
          id?: string
          local_destino?: string
          militar_responsavel?: string
          nome?: string
          observacoes?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_cabo_on_duty: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_administrador: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "administrador" | "cabo_auxiliar"
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
      app_role: ["administrador", "cabo_auxiliar"],
    },
  },
} as const
