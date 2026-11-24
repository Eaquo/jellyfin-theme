# Jellyfin Dock Theme

Thème très sombre pour Jellyfin, en verre dépoli et tout en rondeurs : la navigation flotte dans un **dock** en bas de l'écran, les affiches se soulèvent avec un **halo cyan** au survol, et les épisodes s'affichent en grande grille.

Un seul fichier CSS, rien à installer sur le serveur, aucun JavaScript.

![Accueil](docs/accueil.png)

---

## Installation

1. Dans Jellyfin, ouvrir **Tableau de bord → Branding** (ou *Dashboard → Branding*).
2. Coller cette ligne **tout en haut** du champ **Custom CSS code** :
   ```css
   @import url("https://eaquo.github.io/jellyfin-theme/theme.css");
   ```
3. **Enregistrer**, puis recharger la page (**Ctrl + Maj + R**).

C'est tout : le thème s'applique à tous les utilisateurs et à toutes les applis qui utilisent l'interface web (navigateur, Jellyfin Desktop, Android, iOS).

> **La ligne `@import` doit rester la première.** Un navigateur ignore un `@import` placé après d'autres règles CSS.

Recommandé : choisir le thème **Dark** dans **Paramètres → Affichage**.

---

## Ce que fait le thème

| | |
|---|---|
| **Dock flottant** | La barre de navigation devient une pilule de verre en bas de l'écran. Dans une bibliothèque, les outils (Tout lire, aléatoire, filtres, tri) forment une deuxième pilule plus discrète juste au-dessus. |
| **Affiches** | Coins arrondis, ombre douce, la carte se soulève avec un léger halo cyan au survol. Les vignettes sans image deviennent du verre teinté. |
| **Pages de détail** | Plus de bande grise : titre, infos et boutons flottent sur le fond. Boutons d'action ronds en verre, « Lecture » en blanc. |
| **Saisons** | Affiches arrondies, titre « Saison 1 » en pilule ; une saison entièrement vue est atténuée. |
| **Épisodes** | Grille de grandes vignettes 16:9 avec le numéro en pastille ronde ; le résumé se déplie au survol. Les épisodes vus sont atténués, l'épisode à reprendre est cerclé de cyan et mis en avant. |
| **Fenêtres et menus** | Fenêtres d'options (Modifier, Identifier…), menus ⋮ et champs de saisie en verre, anneau cyan au focus. |
| **Accessibilité** | Respecte les réglages système *Réduire les animations* et *Réduire la transparence*. |

## Écrans pris en charge

| Écran | Comportement |
|---|---|
| **Ordinateur** | Dock en bas, effets au survol. |
| **Ultrawide (21:9 et plus)** | Le contenu des pages de détail reste centré, le texte ne s'étire pas sur toute la largeur. |
| **Mobile** | Dock en icônes seules, défilable, au-dessus de la barre système ; épisodes sur une colonne avec résumé visible. |
| **TV** | La barre d'origine reste en haut pour la télécommande ; l'élément sélectionné est entouré d'un anneau cyan bien visible de loin. |

---

## Personnaliser

Ajouter les variables à changer **sous** la ligne `@import`, dans le même champ Custom CSS :

```css
:root {
  --glow: 80, 220, 255;   /* couleur du halo, en r, g, b (ici cyan) */
  --accent: #ffffff;      /* boutons actifs et barres de progression */
  --bg: #07070a;          /* fond des pages */
  --radius: 22px;         /* arrondi des cartes et panneaux */
}
```

Exemples de halo : violet `170, 120, 255` · vert `80, 255, 170` · orange `255, 160, 60`.

---

## Dépannage

**Le thème ne s'affiche pas**
- Vérifier que la ligne `@import` est bien la **première** du champ Custom CSS.
- Dans **Paramètres → Affichage**, la case **« Désactiver le CSS personnalisé du serveur »** doit être décochée, et le champ **« CSS personnalisé »** (local au navigateur) de préférence vide.
- Recharger avec **Ctrl + Maj + R** pour ignorer le cache.

**Jellyfin Desktop / Jellyfin Media Player ne change pas**
- Fermer complètement l'application et la rouvrir : elle ne relit le CSS du serveur qu'au démarrage.

**Une mise à jour du thème n'apparaît pas**
- Le fichier peut rester en cache jusqu'à 10 minutes. Recharger avec **Ctrl + Maj + R**.

---

## Désinstaller

Supprimer la ligne `@import` du champ Custom CSS, enregistrer, recharger.

---

Testé sur Jellyfin 12.4 dans un navigateur de bureau. Mobile et TV : pris en charge mais pas encore testés sur appareil réel.
