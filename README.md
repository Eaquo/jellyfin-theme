# Jellyfin Theme

Thème sombre pour Jellyfin : verre dépoli, affiches arrondies qui s'illuminent au survol, accent doré.

## Installation

1. Dans Jellyfin, ouvrir **Tableau de bord → Branding**.
2. Coller cette ligne **tout en haut** de **Custom CSS code** :
   ```css
   @import url("https://cdn.jsdelivr.net/gh/Eaquo/jellyfin-theme@main/theme.css");
   ```
3. **Enregistrer**, puis recharger la page.

Prévu pour le thème **Dark** de Jellyfin (Paramètres → Affichage).

## Personnaliser

Ajouter sous la ligne `@import` pour changer les couleurs :

```css
:root {
  --accent: #e5a00d;
  --radius: 12px;
}
```

## Désinstaller

Supprimer la ligne `@import` du Custom CSS.
