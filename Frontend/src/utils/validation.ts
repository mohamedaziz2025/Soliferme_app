// Common validation rules for forms
export const validation = {
  // User related validations
  name: {
    required: "Le nom est requis",
    minLength: {
      value: 2,
      message: "Le nom doit contenir au moins 2 caractères"
    },
    maxLength: {
      value: 50,
      message: "Le nom ne peut pas dépasser 50 caractères"
    },
    pattern: {
      value: /^[a-zA-ZÀ-ÿ\s-]+$/,
      message: "Le nom ne peut contenir que des lettres, espaces et tirets"
    }
  },
  email: {
    required: "L'email est requis",
    pattern: {
      value: /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/,
      message: "L'adresse email n'est pas valide"
    }
  },
  password: {
    required: "Le mot de passe est requis",
    minLength: {
      value: 8,
      message: "Le mot de passe doit contenir au moins 8 caractères"
    },
    pattern: {
      value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,}$/,
      message: "Le mot de passe doit contenir au moins une majuscule, une minuscule, un chiffre et un caractère spécial"
    }
  },
  currentPassword: {
    required: "Le mot de passe actuel est requis"
  },
  language: {
    required: "La langue est requise",
    validLanguages: ["fr", "en", "ar"]
  },

  // Tree related validations
  treeId: {
    required: "L'ID de l'arbre est requis",
    pattern: {
      value: /^[a-zA-Z0-9-]+$/,
      message: "L'ID ne peut contenir que des lettres, chiffres et tirets"
    }
  },
  treeType: {
    required: "Le type d'arbre est requis",
    minLength: {
      value: 2,
      message: "Le type d'arbre doit contenir au moins 2 caractères"
    },
    maxLength: {
      value: 50,
      message: "Le type d'arbre ne peut pas dépasser 50 caractères"
    },
    pattern: {
      value: /^[a-zA-ZÀ-ÿ\s-]+$/,
      message: "Le type d'arbre ne peut contenir que des lettres, espaces et tirets"
    }
  },
  coordinates: {
    required: "Les coordonnées sont requises",
    validate: {
      latitude: (value: number) => 
        (value >= -90 && value <= 90) || "La latitude doit être comprise entre -90 et 90",
      longitude: (value: number) => 
        (value >= -180 && value <= 180) || "La longitude doit être comprise entre -180 et 180"
    }
  },
  measurements: {
    height: {
      required: "La hauteur est requise",
      min: {
        value: 0,
        message: "La hauteur doit être positive"
      },
      max: {
        value: 100,
        message: "La hauteur ne peut pas dépasser 100 mètres"
      }
    },
    width: {
      required: "La largeur est requise",
      min: {
        value: 0,
        message: "La largeur doit être positive"
      },
      max: {
        value: 100,
        message: "La largeur ne peut pas dépasser 100 mètres"
      }
    }
  }
};

export const validateFormField = (value: any, rules: any): string | null => {
  if (rules.required && (!value || (typeof value === "string" && !value.trim()))) {
    return rules.required;
  }

  if (value) {
    if (rules.minLength && value.length < rules.minLength.value) {
      return rules.minLength.message;
    }

    if (rules.maxLength && value.length > rules.maxLength.value) {
      return rules.maxLength.message;
    }

    if (rules.pattern && !rules.pattern.value.test(value)) {
      return rules.pattern.message;
    }

    if (rules.validate) {
      for (const [key, validator] of Object.entries(rules.validate)) {
        const result = (validator as Function)(value);
        if (typeof result === "string") {
          return result;
        }
      }
    }
  }

  return null;
};
