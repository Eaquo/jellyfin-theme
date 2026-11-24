# Jellyfin Theme

Thème très sombre pour Jellyfin : navigation dans un dock de verre flottant en bas de l'écran, affiches arrondies qui se soulèvent au survol.

## Installation

1. Dans Jellyfin, ouvrir **Tableau de bord → Branding**.
2. Coller cette ligne **tout en haut** de **Custom CSS code** :
   ```css
   @import url("https://eaquo.github.io/jellyfin-theme/theme.css");
   ```
3. **Enregistrer**, puis recharger la page.

Prévu pour le thème **Dark** de Jellyfin (Paramètres → Affichage).

## Personnaliser

Ajouter sous la ligne `@import` pour changer les couleurs :

```css
:root {
  --accent: #ffffff;
  --radius: 12px;
}
```

## Désinstaller

Supprimer la ligne `@import` du Custom CSS.
