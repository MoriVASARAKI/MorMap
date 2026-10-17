/* MorMap user guide. Shared by the in-product guide and offline manuals. */
(function(root){
'use strict';
const data={
  "version": "1.0.8",
  "groups": {
    "start": {
      "en": "Get started",
      "fr": "Bien démarrer"
    },
    "build": {
      "en": "Build & arrange",
      "fr": "Créer et organiser"
    },
    "cables": {
      "en": "Cables & formatting",
      "fr": "Câbles et mise en forme"
    },
    "inspect": {
      "en": "Inspect & trace",
      "fr": "Inspecter et tracer"
    },
    "share": {
      "en": "Save & share",
      "fr": "Enregistrer et partager"
    },
    "manage": {
      "en": "Manage & reuse",
      "fr": "Gérer et réutiliser"
    },
    "reference": {
      "en": "Reference & fixes",
      "fr": "Références et dépannage"
    }
  },
  "workspaces": {
    "logical": {
      "label": "Logical",
      "start": "logical-start",
      "description": {
        "en": "Devices, ports and network diagrams",
        "fr": "Périphériques, ports et schémas réseau"
      }
    },
    "physical": {
      "label": "Physical",
      "start": "physical-start",
      "description": {
        "en": "Sites, racks and physical cable paths",
        "fr": "Sites, baies et chemins physiques"
      }
    },
    "library": {
      "label": "Asset Library",
      "start": "asset-start",
      "description": {
        "en": "Reusable images and connection positions",
        "fr": "Images et positions réutilisables"
      }
    }
  },
  "topics": [
{
  "id": "virtual-guests",
  "scopes": [
    "logical",
    "physical"
  ],
  "group": "build",
  "tags": "VM CT Proxmox Hyper-V hypervisor guest virtual machine container",
  "related": [
    "shared-model",
    "save-documents"
  ],
  "en": {
    "title": "Virtual machines and containers",
    "intro": "Manually associate existing LibreNMS devices with their hypervisor, without changing network connections.",
    "sections": [
      {
        "title": "Assign and inspect",
        "steps": [
          "Select the hypervisor device. Open Properties → Virtual machines / containers → Assign LibreNMS devices.",
          "Search LibreNMS, select the guests, choose VM or CT and optionally enter a VMID. Apply the selection. A guest already assigned elsewhere shows the host it will move from.",
          "Right-click a recognized hypervisor and choose Show VMs at the top, or click its host badge. Guest names display their LibreNMS OS icons. Filter VMs / CTs or search by name, VMID, OS and IP. Status is the LibreNMS monitoring state, not the guest power state."
        ]
      },
      {
        "title": "Arrange groups on the map",
        "steps": [
          "Select guests in the Map column and choose Show selected on map. Dotted lines represent host membership.",
          "Drag the group header to move the whole group independently of the host and cables. Resize from its lower-right corner. Several groups can stay expanded.",
          "Save the map to retain positions per hypervisor and map. Physical saves separate layouts for each location / cabling view. Collapse and expand retain the placement. Fit content includes expanded groups."
        ]
      },
      {
        "note": "Assignments are shared by Logical and Physical and saved immediately with Undo. Unlink removes membership without deleting a device or cable. Map layout uses normal Save / Undo / Publish. Published views permit temporary expansion and filtering without editing stored data. Missing LibreNMS devices remain listed as unavailable."
      }
    ]
  },
  "fr": {
    "title": "Machines virtuelles et conteneurs",
    "intro": "Associez manuellement les périphériques LibreNMS à leur hyperviseur sans modifier les connexions réseau.",
    "sections": [
      {
        "title": "Associer et consulter",
        "steps": [
          "Sélectionnez l’hyperviseur, puis Properties → Virtual machines / containers → Assign LibreNMS devices.",
          "Recherchez et sélectionnez les invités, choisissez VM ou CT et renseignez éventuellement le VMID. Validez. Un invité déjà associé affiche son hyperviseur précédent avant le déplacement.",
          "Faites un clic droit sur un hyperviseur reconnu et choisissez Show VMs en haut du menu, ou cliquez sur son badge. Les noms des invités affichent leur icône de système LibreNMS. Filtrez par VM / CT, système ou IP. L’état provient de la supervision LibreNMS, pas de l’alimentation de la VM."
        ]
      },
      {
        "title": "Organiser la carte",
        "steps": [
          "Cochez les invités dans la colonne Map et cliquez sur Show selected on map. Les pointillés représentent l’appartenance à l’hôte.",
          "Déplacez le groupe par son en-tête et redimensionnez-le par le coin inférieur droit, indépendamment de l’hôte et des câbles. Plusieurs groupes peuvent rester ouverts.",
          "Enregistrez la carte pour conserver la position. Chaque carte, hyperviseur et vue Physical possède sa disposition. Réduire puis développer conserve la position."
        ]
      },
      {
        "note": "Les associations sont partagées entre Logical et Physical et enregistrées immédiatement avec Undo. Unlink conserve le périphérique et les câbles. La disposition utilise Save / Undo / Publish. Une publication permet une consultation temporaire sans écriture. Les périphériques retirés restent indiqués comme indisponibles."
      }
    ]
  }
},
    {
      "id": "logical-start",
      "scopes": [
        "logical"
      ],
      "group": "start",
      "tags": "",
      "related": [
        "shared-model",
        "port-binding",
        "cable-create",
        "save-documents"
      ],
      "en": {
        "title": "Your first logical map",
        "intro": "Build a diagram with real devices, individually bound ports and cables you can route by hand.",
        "sections": [
          {
            "title": "Build a small map first",
            "steps": [
              "Choose New, give the map a name and confirm. Use Page size if you need a different canvas.",
              "Choose Device. Select a LibreNMS device, choose its image, review the port assignments and apply. Place a second device the same way.",
              "If an image has no points, activate X, click the device image and choose an existing interface. Add one point per required port.",
              "Choose Cable and click the source and destination points. Select the cable to adjust its route or right-click it for Format Cable.",
              "Save the map. Use Publish when the saved layout is ready for viewers, or Print / Export for a file."
            ]
          },
          {
            "note": "Check your result: select each point and verify its device and interface. A point label alone does not establish the binding."
          }
        ]
      },
      "fr": {
        "title": "Votre première carte logique",
        "intro": "Créez un schéma avec de vrais périphériques, des ports associés individuellement et des câbles dont vous maîtrisez le tracé.",
        "sections": [
          {
            "title": "Créer une première carte",
            "steps": [
              "Choisissez New, nommez la carte et validez. Page size permet de modifier les dimensions de la page.",
              "Choisissez Device. Sélectionnez un périphérique LibreNMS, son image et les associations de ports, puis validez. Ajoutez un second périphérique.",
              "Si l’image ne possède aucun point, activez X, cliquez sur le périphérique et choisissez une interface existante. Ajoutez un point par port nécessaire.",
              "Choisissez Cable et cliquez sur les points source et destination. Sélectionnez le câble pour ajuster son tracé, ou ouvrez Format Cable par clic droit.",
              "Enregistrez avec Save. Utilisez Publish lorsque la disposition enregistrée est prête à être consultée, ou Print / Export pour créer un fichier."
            ]
          },
          {
            "note": "Vérifiez le résultat : sélectionnez chaque point et contrôlez son périphérique et son interface. Le libellé seul ne crée pas l’association."
          }
        ]
      }
    },
    {
      "id": "physical-start",
      "scopes": [
        "physical"
      ],
      "group": "start",
      "tags": "",
      "related": [
        "physical-locations",
        "physical-racks",
        "physical-floor",
        "physical-trace"
      ],
      "en": {
        "title": "Your first physical plan",
        "intro": "Start from the site, build its hierarchy, then place equipment and document real cable paths.",
        "sections": [
          {
            "title": "Build a small site",
            "steps": [
              "Choose New and name the plan. Main Setup creates a Site, Building, Floor, ServerRoom and Rack together.",
              "Enter each level by double-clicking its container, or use Locations and the breadcrumbs. The up arrow returns to the parent.",
              "In a rack or location, choose Device for existing LibreNMS equipment, or Component / Device without IP for passive equipment. Bind the required ports.",
              "Connect exact ports with Cable. Use Cabling view for expanded rack fronts or Connections for endpoints in different locations.",
              "Save the plan. Verify one complete route with Trace Physical Path, then Publish or Print / Export."
            ]
          },
          {
            "note": "U1 is at the bottom of a rack. Give each piece of equipment its real height in U and check rack capacity before placement."
          }
        ]
      },
      "fr": {
        "title": "Votre premier plan physique",
        "intro": "Partez du site, construisez sa hiérarchie, puis placez les équipements et documentez les chemins de câbles.",
        "sections": [
          {
            "title": "Créer un premier site",
            "steps": [
              "Choisissez New et nommez le plan. Main Setup crée ensemble Site, Building, Floor, ServerRoom et Rack.",
              "Entrez dans chaque niveau par double-clic sur son conteneur, ou utilisez Locations et le fil d’Ariane. La flèche vers le haut remonte au parent.",
              "Dans une baie ou un lieu, choisissez Device pour les équipements LibreNMS, ou Component / Device without IP pour le matériel passif. Associez les ports nécessaires.",
              "Reliez les ports exacts avec Cable. Utilisez Cabling view pour afficher les faces de baies ou Connections pour des lieux différents.",
              "Enregistrez. Vérifiez un chemin complet avec Trace Physical Path puis utilisez Publish ou Print / Export."
            ]
          },
          {
            "note": "U1 se trouve en bas de la baie. Indiquez la hauteur réelle de chaque équipement en U et vérifiez la capacité de la baie."
          }
        ]
      }
    },
    {
      "id": "asset-start",
      "scopes": [
        "library"
      ],
      "group": "start",
      "tags": "",
      "related": [
        "asset-import",
        "asset-positions",
        "port-binding"
      ],
      "en": {
        "title": "Your first reusable asset",
        "intro": "Prepare an image once, place its connection positions, then reuse it for real equipment in Logical and Physical.",
        "sections": [
          {
            "title": "Create a useful template",
            "steps": [
              "Choose an existing vector or Import an image. The library starts on Vectors; use Images, Logos or All and the search field to find another asset.",
              "Select the asset to show its preview and Properties. Give it a recognizable name.",
              "Activate X and click each socket position. Name the positions and align them where needed.",
              "Save. In Logical or Physical, choose Device and this image, then bind its positions to that device’s actual ports."
            ]
          },
          {
            "note": "Library points are reusable positions, not monitored interfaces. Their green appearance in the template preview is not a network UP state. Each placed device gets its own bindings."
          }
        ]
      },
      "fr": {
        "title": "Votre premier modèle réutilisable",
        "intro": "Préparez une image, placez ses points de connexion puis réutilisez-la pour les équipements dans Logical et Physical.",
        "sections": [
          {
            "title": "Créer un modèle utile",
            "steps": [
              "Choisissez un vecteur existant ou Import pour ajouter une image. La bibliothèque s’ouvre sur Vectors ; utilisez Images, Logos ou All et la recherche.",
              "Sélectionnez le modèle pour afficher son aperçu et Properties. Donnez-lui un nom reconnaissable.",
              "Activez X et cliquez sur les prises. Nommez les positions et alignez-les si nécessaire.",
              "Enregistrez. Dans Logical ou Physical, choisissez Device et cette image, puis associez les positions aux vrais ports du périphérique."
            ]
          },
          {
            "note": "Les points de bibliothèque sont des positions, pas des interfaces supervisées. Leur aspect vert dans l’aperçu du modèle ne signifie pas UP. Chaque périphérique placé reçoit ses propres associations."
          }
        ]
      }
    },
    {
      "id": "shared-model",
      "scopes": [
        "logical",
        "physical"
      ],
      "group": "start",
      "tags": "",
      "related": [
        "port-status",
        "physical-trace",
        "asset-start"
      ],
      "en": {
        "title": "How the three workspaces fit together",
        "intro": "An asset is a reusable image. A device has its own identity and ports. A map or plan gives that equipment a visual layout.",
        "sections": [
          {
            "title": "What is shared?",
            "table": {
              "head": [
                "Item",
                "Meaning"
              ],
              "rows": [
                [
                  "Asset Library",
                  "Image, template connection positions and default appearance for new placements."
                ],
                [
                  "Logical",
                  "A diagram of devices and connections, with its own layout and cable presentation."
                ],
                [
                  "Physical",
                  "Site → Building → Floor → ServerRoom → Rack, equipment locations and physical paths."
                ],
                [
                  "Shared infrastructure",
                  "The same equipment, port identities and physical locations. Logical connections and Physical cables have separate occupancy rules."
                ]
              ]
            }
          },
          {
            "title": "Work with the same equipment",
            "body": [
              "Select an existing device when placing it in another workspace. Save image positions and bindings before opening that device elsewhere. A second representation does not create a second physical interface.",
              "Multiple connections per port are allowed in either topology. Existing connections are retained. Ambiguous paths, passive loops and mismatched stack roles show warnings without blocking drawing, Save or Undo. Logical and Physical remain independent. Front/rear internal continuity is not a cable."
            ]
          }
        ]
      },
      "fr": {
        "title": "Comprendre les trois espaces",
        "intro": "Un asset est une image réutilisable. Un périphérique possède son identité et ses ports. Une carte ou un plan organise leur représentation.",
        "sections": [
          {
            "title": "Quelles données sont partagées ?",
            "table": {
              "head": [
                "Élément",
                "Fonction"
              ],
              "rows": [
                [
                  "Asset Library",
                  "Image, positions de connexion du modèle et style initial des nouveaux placements."
                ],
                [
                  "Logical",
                  "Un schéma de périphériques et de connexions avec sa propre disposition et présentation des câbles."
                ],
                [
                  "Physical",
                  "Site → Building → Floor → ServerRoom → Rack, emplacements des équipements et chemins physiques."
                ],
                [
                  "Infrastructure partagée",
                  "Les mêmes équipements, identités de ports et emplacements physiques. Les connexions Logical et les câbles Physical ont des règles d’occupation distinctes."
                ]
              ]
            }
          },
          {
            "title": "Réutiliser le même équipement",
            "body": [
              "Choisissez le périphérique existant pour le placer dans un autre espace. Enregistrez ses positions et associations avant de l’ouvrir ailleurs. Une seconde représentation ne crée pas une nouvelle interface physique.",
              "Plusieurs connexions par port sont autorisées dans chaque topologie. Les connexions existantes sont conservées. Les chemins ambigus, boucles passives et rôles Stack incohérents affichent un avertissement sans bloquer le dessin, Save ou Undo. Logical et Physical restent indépendants."
            ]
          }
        ]
      }
    },
    {
      "id": "workspace-controls",
      "scopes": [
        "logical",
        "physical"
      ],
      "group": "start",
      "tags": "",
      "related": [
        "select-pan",
        "keyboard",
        "save-documents"
      ],
      "en": {
        "title": "Find tools and manage the workspace",
        "intro": "The command strip uses the same groups in both map workspaces. Hover an icon to see its name.",
        "sections": [
          {
            "title": "Command guide",
            "table": {
              "head": [
                "Group",
                "Use"
              ],
              "rows": [
                [
                  "Document",
                  "New, Rename, Delete map/plan, Save, Reload, Undo and Redo."
                ],
                [
                  "Tools / Insert",
                  "Select, Pan, X connection point, Cable and Device. Physical also provides locations and Connections."
                ],
                [
                  "Arrange",
                  "Format Painter, Align points and Port groups."
                ],
                [
                  "View",
                  "Fit page, Fit content, Grid, Snap, Properties and physical Trace."
                ],
                [
                  "Share / Page",
                  "Publish, Print / Export and workspace-specific page, drawing or setup commands."
                ]
              ]
            }
          },
          {
            "title": "Panels and windows",
            "body": [
              "Logical has a searchable device list. Physical has Locations, breadcrumbs and an up-one-level button. Properties shows the selected item; its button opens or hides the panel.",
              "Drag a dialog title to move its window. The minus button minimizes it while keeping entered values; Restore brings it back. General messages and painter instructions appear along the bottom."
            ]
          }
        ]
      },
      "fr": {
        "title": "Repérer les outils et organiser l’espace",
        "intro": "La barre de commandes utilise les mêmes groupes dans les deux espaces de cartes. Survolez une icône pour afficher son nom.",
        "sections": [
          {
            "title": "Repères des commandes",
            "table": {
              "head": [
                "Groupe",
                "Utilisation"
              ],
              "rows": [
                [
                  "Document",
                  "New, Rename, Delete map/plan, Save, Reload, Undo et Redo."
                ],
                [
                  "Tools / Insert",
                  "Select, Pan, point X, Cable et Device. Physical propose aussi les lieux et Connections."
                ],
                [
                  "Arrange",
                  "Format Painter, Align points et Port groups."
                ],
                [
                  "View",
                  "Fit page, Fit content, Grid, Snap, Properties et Trace physique."
                ],
                [
                  "Share / Page",
                  "Publish, Print / Export et les commandes de page, dessin ou configuration propres à chaque espace."
                ]
              ]
            }
          },
          {
            "title": "Panneaux et fenêtres",
            "body": [
              "Logical propose une liste de périphériques avec recherche. Physical dispose de Locations, du fil d’Ariane et d’un bouton pour remonter. Properties affiche l’élément sélectionné et peut être masqué.",
              "Déplacez une fenêtre par son titre. Le bouton moins la réduit en conservant les valeurs saisies ; Restore la rétablit. Les messages et instructions du pinceau apparaissent en bas."
            ]
          }
        ]
      }
    },
    {
      "id": "select-pan",
      "scopes": [
        "logical",
        "physical"
      ],
      "group": "start",
      "tags": "",
      "related": [
        "keyboard",
        "format-painter",
        "physical-racks"
      ],
      "en": {
        "title": "Select, move, pan and zoom",
        "intro": "Selection edits objects. Pan moves your view of the canvas without changing the drawing.",
        "sections": [
          {
            "title": "Choose the right gesture",
            "table": {
              "head": [
                "Gesture",
                "Result"
              ],
              "rows": [
                [
                  "Click an object or a cable line",
                  "Select that item."
                ],
                [
                  "Ctrl / Cmd / Shift + click",
                  "Add or remove an item from a mixed device/cable selection."
                ],
                [
                  "Left-drag empty canvas",
                  "Select a rectangular region."
                ],
                [
                  "Drag a selected object",
                  "Move the selection; physical rack moves respect U allocations."
                ],
                [
                  "Alt + left-drag / Space + left-drag / middle-drag",
                  "Pan. The Pan hand tool also enables left-drag panning without a held key."
                ],
                [
                  "Mouse wheel / Fit page / Fit content",
                  "Zoom at the pointer / show the page / frame existing content."
                ]
              ]
            }
          },
          {
            "note": "Space inside a text field types normally. On a connection point, Alt is reserved for free placement without snapping; use the Pan hand tool, Space or middle-drag to pan there. Choose Select or press Escape to leave Pan."
          },
          {
            "title": "Grid and Snap are separate",
            "body": [
              "Grid shows the drawing grid. Snap controls alignment during placement. Disable Snap for free positioning; Alt also bypasses point snapping temporarily."
            ]
          }
        ]
      },
      "fr": {
        "title": "Sélectionner, déplacer et zoomer",
        "intro": "La sélection sert à modifier les objets. Pan déplace votre vue sans modifier le dessin.",
        "sections": [
          {
            "title": "Choisir le bon geste",
            "table": {
              "head": [
                "Geste",
                "Résultat"
              ],
              "rows": [
                [
                  "Cliquer sur un objet ou un trait de câble",
                  "Sélectionner cet élément."
                ],
                [
                  "Ctrl / Cmd / Shift + clic",
                  "Ajouter ou retirer un élément d’une sélection de périphériques et de câbles."
                ],
                [
                  "Glisser sur le fond avec le bouton gauche",
                  "Sélectionner une zone rectangulaire."
                ],
                [
                  "Glisser un objet sélectionné",
                  "Déplacer la sélection ; dans une baie, les emplacements U restent contrôlés."
                ],
                [
                  "Alt + glisser / Espace + glisser / bouton central",
                  "Déplacer la vue. L’outil Pan permet aussi de glisser sans maintenir de touche."
                ],
                [
                  "Molette / Fit page / Fit content",
                  "Zoomer au pointeur / afficher la page / cadrer les éléments."
                ]
              ]
            }
          },
          {
            "note": "Dans un champ, Espace conserve la saisie normale. Sur un point de connexion, Alt permet le placement libre sans aimantation ; utilisez Pan, Espace ou le bouton central pour déplacer la vue. Select ou Escape quitte Pan."
          },
          {
            "title": "Grid et Snap sont indépendants",
            "body": [
              "Grid affiche la grille. Snap gère l’aimantation pendant le placement. Désactivez Snap pour un positionnement libre ; Alt ignore aussi temporairement l’aimantation des points."
            ]
          }
        ]
      }
    },
    {
      "id": "asset-navigation",
      "scopes": [
        "library"
      ],
      "group": "start",
      "tags": "",
      "related": [
        "asset-positions",
        "asset-format"
      ],
      "en": {
        "title": "Browse, pan and inspect an asset",
        "intro": "The library preview has different gestures from the map editors because it edits one image at a time.",
        "sections": [
          {
            "title": "Library controls",
            "table": {
              "head": [
                "Control",
                "Action"
              ],
              "rows": [
                [
                  "Vectors / Images / Logos / All",
                  "Filter the catalogue; search matches asset names."
                ],
                [
                  "Select + left-drag empty preview",
                  "Pan the preview. X must be off. Dragging a point moves that point instead."
                ],
                [
                  "Mouse wheel",
                  "Zoom around the pointer."
                ],
                [
                  "Fit page / Fit content",
                  "Reframe the asset preview."
                ],
                [
                  "Grid / Snap",
                  "Show the grid / align points to neighboring positions."
                ],
                [
                  "Properties",
                  "Show or hide the name and position list."
                ],
                [
                  "F1 / Help",
                  "Open this guide on Asset Library."
                ]
              ]
            }
          },
          {
            "note": "Library Undo / Redo covers the last fifty appearance, position and deletion actions. Save retains that history."
          }
        ]
      },
      "fr": {
        "title": "Parcourir et examiner un modèle",
        "intro": "L’aperçu de bibliothèque utilise des gestes différents des cartes, car il modifie une image à la fois.",
        "sections": [
          {
            "title": "Commandes de bibliothèque",
            "table": {
              "head": [
                "Commande",
                "Action"
              ],
              "rows": [
                [
                  "Vectors / Images / Logos / All",
                  "Filtrer le catalogue ; la recherche porte sur les noms."
                ],
                [
                  "Select + glisser sur le fond de l’aperçu",
                  "Déplacer la vue, avec X désactivé. Glisser un point déplace ce point."
                ],
                [
                  "Molette",
                  "Zoomer autour du pointeur."
                ],
                [
                  "Fit page / Fit content",
                  "Recadrer l’aperçu du modèle."
                ],
                [
                  "Grid / Snap",
                  "Afficher la grille / aligner les points sur les positions voisines."
                ],
                [
                  "Properties",
                  "Afficher ou masquer le nom et la liste des positions."
                ],
                [
                  "F1 / Help",
                  "Ouvrir ce guide sur Asset Library."
                ]
              ]
            }
          },
          {
            "note": "Undo / Redo couvre les cinquante dernières actions de style, de position et de suppression. Save conserve cet historique."
          }
        ]
      }
    },
    {
      "id": "physical-locations",
      "scopes": [
        "physical"
      ],
      "group": "build",
      "tags": "",
      "related": [
        "physical-racks",
        "physical-drawing",
        "physical-connections"
      ],
      "en": {
        "title": "Locations and navigation",
        "intro": "The hierarchy is Site → Building → Floor → ServerRoom → Rack. Each level has its own layout.",
        "sections": [
          {
            "title": "Create and edit locations",
            "steps": [
              "Use Main Setup for a complete starting hierarchy. To extend it, enter a parent and use the location command, whose label follows the available level.",
              "Select a location and open Properties. Edit its name, position, dimensions and available metadata such as address, coordinates or rack capacity.",
              "Drag the container to position it and use its corner handle to resize. Double-click to enter. Single-click keeps it selected for editing.",
              "Use Locations, breadcrumbs or the up arrow to move through the hierarchy. Fit content helps when objects are outside the visible area."
            ]
          },
          {
            "title": "Keep placement explicit",
            "body": [
              "A device has one physical location per plan. Use its Properties to change that location. Separate plans can still reference the same shared equipment and cable infrastructure."
            ]
          }
        ]
      },
      "fr": {
        "title": "Lieux et navigation",
        "intro": "La hiérarchie est Site → Building → Floor → ServerRoom → Rack. Chaque niveau possède sa disposition.",
        "sections": [
          {
            "title": "Créer et modifier les lieux",
            "steps": [
              "Utilisez Main Setup pour une hiérarchie initiale complète. Pour l’étendre, entrez dans un parent et utilisez la commande de lieu, dont le libellé suit le niveau disponible.",
              "Sélectionnez un lieu et ouvrez Properties. Modifiez son nom, sa position, ses dimensions et les métadonnées disponibles : adresse, coordonnées ou capacité de baie.",
              "Déplacez le conteneur et utilisez sa poignée d’angle pour le redimensionner. Le double-clic permet d’entrer ; un clic le sélectionne pour modification.",
              "Utilisez Locations, le fil d’Ariane ou la flèche de remontée. Fit content aide à retrouver les objets hors de la zone visible."
            ]
          },
          {
            "title": "Conserver un emplacement explicite",
            "body": [
              "Un périphérique possède un emplacement physique par plan. Modifiez cet emplacement dans Properties. Des plans distincts peuvent référencer les mêmes équipements et câbles partagés."
            ]
          }
        ]
      }
    },
    {
      "id": "physical-racks",
      "scopes": [
        "physical"
      ],
      "group": "build",
      "tags": "",
      "related": [
        "physical-shared-routes",
        "physical-locations",
        "select-pan"
      ],
      "en": {
        "title": "Rack placement and ordering",
        "intro": "Rack fronts show equipment at its U position. Sibling rack order controls the left-to-right arrangement in the room.",
        "sections": [
          {
            "title": "Place equipment in a rack",
            "steps": [
              "Set the rack capacity in Properties. Enter the rack and add or select equipment.",
              "Set First U, Height (U) and width. U1 is at the bottom. The equipment must fit within capacity without overlapping another allocation.",
              "Drag equipment vertically to change its U. A multi-selection can move together when every new allocation is valid. Save the result."
            ]
          },
          {
            "title": "Reorder the room’s racks",
            "steps": [
              "In Locations, drag the three-line handle beside a rack above or below another rack in the same room. The drop indicator shows the new position.",
              "Alternatively focus the handle and press Alt+Up or Alt+Down. Reordering changes the display order, not device U positions or port identities.",
              "Check the room’s rack fronts. Undo/Redo can reverse or repeat the change; Save and Reload retain it."
            ]
          },
          {
            "note": "This handle reorders sibling racks; it does not move a rack to another parent. View-only plans have no reorder handle."
          }
        ]
      },
      "fr": {
        "title": "Placement et ordre des baies",
        "intro": "Les faces de baies affichent les équipements à leur position U. L’ordre des baies d’une salle détermine leur disposition de gauche à droite.",
        "sections": [
          {
            "title": "Placer un équipement dans une baie",
            "steps": [
              "Réglez la capacité dans Properties. Entrez dans la baie et ajoutez ou sélectionnez l’équipement.",
              "Réglez First U, Height (U) et la largeur. U1 est en bas. L’équipement doit respecter la capacité et les emplacements déjà utilisés.",
              "Glissez verticalement pour changer le U. Une sélection multiple peut se déplacer ensemble si chaque nouvelle allocation est valide. Enregistrez."
            ]
          },
          {
            "title": "Réordonner les baies de la salle",
            "steps": [
              "Dans Locations, glissez la poignée à trois lignes d’une baie au-dessus ou au-dessous d’une autre baie de la même salle. L’indicateur montre la nouvelle position.",
              "Vous pouvez aussi sélectionner la poignée au clavier puis utiliser Alt+Haut ou Alt+Bas. Le classement modifie l’ordre d’affichage, pas les U ni les ports.",
              "Vérifiez les faces de baies dans la salle. Undo/Redo annule ou rétablit l’ordre ; Save et Reload le conservent."
            ]
          },
          {
            "note": "Cette poignée classe les baies du même parent ; elle ne les transfère pas vers un autre lieu. Les plans en lecture seule n’affichent pas cette poignée."
          }
        ]
      }
    },
    {
      "id": "physical-floor",
      "scopes": [
        "physical"
      ],
      "group": "build",
      "tags": "",
      "related": [
        "physical-drawing",
        "export",
        "asset-import"
      ],
      "en": {
        "title": "Add a site, building or floor background",
        "intro": "Use PNG, JPG or SVG as a background, then place rooms, equipment and drawings above it.",
        "sections": [
          {
            "title": "Import and position a floor image",
            "steps": [
              "Enter a Site, Building, Floor or ServerRoom and choose Background. Import PNG, JPG or SVG, or select an image already in the library.",
              "Set X/Y, width, height and opacity. Keep image proportions links width and height so the image retains its aspect ratio.",
              "Unlock position to move the image in Select mode. Rooms and equipment drawn above it stay separately selectable.",
              "Once aligned, enable Lock position. Place locations and draw room outlines or labels above the background.",
              "Save. Publish and exports include the background. Remove background removes its placement from this location; the library image remains."
            ]
          },
          {
            "note": "The background is an image layer. MorMap provides schematic drawing tools; architectural CAD editing, dimensioning and DWG import are outside this workflow."
          }
        ]
      },
      "fr": {
        "title": "Ajouter un fond de site, bâtiment ou étage",
        "intro": "Utilisez un PNG, JPG ou SVG comme fond, puis placez les salles, équipements et dessins au-dessus.",
        "sections": [
          {
            "title": "Importer et placer l’image",
            "steps": [
              "Entrez dans un Site, Building, Floor ou ServerRoom puis choisissez Background. Importez PNG, JPG ou SVG, ou sélectionnez une image existante.",
              "Réglez X/Y, largeur, hauteur et opacité. Keep image proportions lie les dimensions pour conserver les proportions.",
              "Déverrouillez la position pour déplacer l’image avec Select. Les salles et équipements au-dessus restent sélectionnables séparément.",
              "Après alignement, activez Lock position. Placez les lieux et dessinez les contours ou libellés au-dessus du fond.",
              "Enregistrez. La publication et les exports incluent le fond. Remove background retire son placement dans cet emplacement ; l’image reste dans la bibliothèque."
            ]
          },
          {
            "note": "Le fond est un calque image. MorMap propose des outils de dessin schématique ; l’édition CAO architecturale, la cotation et l’import DWG ne font pas partie de ce fonctionnement."
          }
        ]
      }
    },
    {
      "id": "physical-drawing",
      "scopes": [
        "physical"
      ],
      "group": "build",
      "tags": "",
      "related": [
        "physical-locations",
        "physical-floor",
        "format-painter"
      ],
      "en": {
        "title": "Draw rooms, shapes and labels",
        "intro": "Use simple drawing objects to explain the space around your equipment.",
        "sections": [
          {
            "title": "Drawing tools",
            "table": {
              "head": [
                "Tool",
                "How to use it"
              ],
              "rows": [
                [
                  "Rectangle / Ellipse",
                  "Choose the tool and drag across the desired area."
                ],
                [
                  "Line",
                  "Choose Line and drag from its start to its end."
                ],
                [
                  "Polygon",
                  "Click successive corners; double-click or press Enter to finish. Escape cancels."
                ],
                [
                  "Text",
                  "Choose Text, click its location and enter the label."
                ]
              ]
            }
          },
          {
            "title": "Refine the result",
            "steps": [
              "Choose Select and click the object. Drag to move, resize with its handle, or edit exact geometry and rotation in Properties.",
              "Set fill, outline, width and text properties as appropriate. Format Painter transfers compatible drawing styles.",
              "Use Grid and Snap independently, then Save. Drawing tools switch to Layout so new drawings are visible."
            ]
          },
          {
            "note": "A drawn rectangle is a drawing, not a location container. Create a ServerRoom or other location when you need equipment hierarchy and navigation."
          }
        ]
      },
      "fr": {
        "title": "Dessiner salles, formes et libellés",
        "intro": "Utilisez des objets de dessin simples pour décrire l’espace autour des équipements.",
        "sections": [
          {
            "title": "Outils de dessin",
            "table": {
              "head": [
                "Outil",
                "Utilisation"
              ],
              "rows": [
                [
                  "Rectangle / Ellipse",
                  "Choisissez l’outil puis glissez sur la zone souhaitée."
                ],
                [
                  "Line",
                  "Choisissez Line puis glissez du début vers la fin."
                ],
                [
                  "Polygon",
                  "Cliquez les sommets ; double-clic ou Enter termine. Escape annule."
                ],
                [
                  "Text",
                  "Choisissez Text, cliquez à l’emplacement puis saisissez le libellé."
                ]
              ]
            }
          },
          {
            "title": "Ajuster le résultat",
            "steps": [
              "Choisissez Select puis cliquez sur l’objet. Glissez pour déplacer, utilisez la poignée pour redimensionner, ou modifiez géométrie et rotation dans Properties.",
              "Réglez le remplissage, le contour, son épaisseur et les propriétés du texte. Format Painter copie les styles compatibles.",
              "Utilisez Grid et Snap indépendamment puis Save. Les outils de dessin passent en Layout pour afficher les nouveaux objets."
            ]
          },
          {
            "note": "Un rectangle dessiné reste un dessin, pas un conteneur de localisation. Créez un ServerRoom ou un autre lieu pour organiser les équipements et la navigation."
          }
        ]
      }
    },
    {
      "id": "physical-coordinates",
      "scopes": [
        "physical"
      ],
      "group": "build",
      "tags": "",
      "related": [
        "physical-locations",
        "physical-floor"
      ],
      "en": {
        "title": "Addresses and geographic coordinates",
        "intro": "Store useful location metadata and position sites or buildings schematically from latitude and longitude.",
        "sections": [
          {
            "title": "Use location metadata",
            "steps": [
              "Select a site or building and open Properties. Fill in its address and the available latitude/longitude fields.",
              "Choose Coordinates to position the locations from their stored geographic coordinates. Review the schematic result with north at the top.",
              "Adjust the drawing as required and Save. Use breadcrumbs and location metadata to identify the site while navigating."
            ]
          },
          {
            "note": "This is a schematic projection. Geographic basemaps, measured distances and GIS-level accuracy are not provided."
          }
        ]
      },
      "fr": {
        "title": "Adresses et coordonnées géographiques",
        "intro": "Conservez les informations de localisation et placez schématiquement sites ou bâtiments selon latitude et longitude.",
        "sections": [
          {
            "title": "Utiliser les métadonnées",
            "steps": [
              "Sélectionnez un site ou bâtiment et ouvrez Properties. Renseignez l’adresse et les champs latitude/longitude disponibles.",
              "Choisissez Coordinates pour placer les lieux selon leurs coordonnées enregistrées. Vérifiez le résultat schématique, avec le nord en haut.",
              "Ajustez le dessin puis Save. Le fil d’Ariane et les métadonnées permettent d’identifier le site pendant la navigation."
            ]
          },
          {
            "note": "Il s’agit d’une projection schématique. Les fonds cartographiques, distances mesurées et précision SIG ne sont pas proposés."
          }
        ]
      }
    },
    {
      "id": "port-binding",
      "scopes": [
        "logical",
        "physical"
      ],
      "group": "build",
      "tags": "",
      "related": [
        "manual-ports",
        "stack",
        "port-troubleshooting",
        "asset-positions"
      ],
      "en": {
        "title": "Add devices and bind X points",
        "intro": "A template point is a position on an image. Binding connects that position to a specific LibreNMS interface or manual port.",
        "sections": [
          {
            "title": "Place and check a device",
            "steps": [
              "Choose Device, select the device type and search for the LibreNMS equipment. Choose an image from Vectors, Images, Logos or All.",
              "Review the image positions and interface selectors. Fill by interface order proposes assignments in interface order. Check every preview row, especially uplinks and stack member ports.",
              "Apply, then use Properties to inspect the saved bindings. Bind image ports adds missing positions while preserving existing port identities and cables.",
              "For a device image without positions, choose X and click its image. Pick Existing port, choose the interface and apply. Repeat for each NIC or connector.",
              "Drag points to their sockets. Align points previews rows, columns and equal spacing. Save before reusing the device in the other workspace."
            ]
          },
          {
            "note": "A port already bound to a point or another stack member is protected from duplicate assignment. Use the full Ports list and the correct Interface scope to find unplaced interfaces."
          }
        ]
      },
      "fr": {
        "title": "Ajouter des périphériques et associer les points X",
        "intro": "Un point de modèle est une position sur une image. L’association le relie à une interface LibreNMS précise ou à un port manuel.",
        "sections": [
          {
            "title": "Placer et vérifier un périphérique",
            "steps": [
              "Choisissez Device, le type de périphérique, puis recherchez l’équipement LibreNMS. Sélectionnez une image dans Vectors, Images, Logos ou All.",
              "Vérifiez les positions et les sélecteurs d’interfaces. Fill by interface order propose les associations selon l’ordre des interfaces. Contrôlez chaque ligne, notamment les uplinks et ports de membres Stack.",
              "Validez puis consultez les associations dans Properties. Bind image ports ajoute les positions manquantes en conservant les ports et câbles existants.",
              "Pour une image sans positions, choisissez X et cliquez dessus. Dans Existing port, choisissez l’interface et validez. Répétez pour chaque carte réseau ou connecteur.",
              "Déplacez les points sur les prises. Align points prévisualise les lignes, colonnes et espacements réguliers. Enregistrez avant de réutiliser le périphérique dans l’autre espace."
            ]
          },
          {
            "note": "Un port déjà associé à un point ou à un autre membre Stack est protégé contre une double affectation. Utilisez la liste Ports et le bon Interface scope pour trouver les interfaces restantes."
          }
        ]
      }
    },
    {
      "id": "manual-ports",
      "scopes": [
        "logical",
        "physical"
      ],
      "group": "build",
      "tags": "",
      "related": [
        "physical-continuity",
        "stack",
        "port-status"
      ],
      "en": {
        "title": "Manual ports and equipment without IP",
        "intro": "Document physical connectors even when LibreNMS does not monitor them.",
        "sections": [
          {
            "title": "Create the connector you need",
            "steps": [
              "For passive equipment, use Device without IP in Device; Physical also offers Component. Choose the type, image and required port count.",
              "On an existing equipment image, choose X → Create manual port. Give it a unique name such as NIC2, Console or Stack1.",
              "Select the connector type: Ethernet, fiber, SFP, management, console, power or stack as appropriate. Choose Single port or Front / rear pair.",
              "Place one point for each actual connector and connect the required ports. Save the map or plan."
            ]
          },
          {
            "note": "Manual means Unmonitored. A device management IP being UP does not establish the state of a manual NIC, stack socket or passive cable."
          },
          {
            "title": "Active equipment without monitoring",
            "body": [
              "Choose Active device (unmonitored) for an unmanaged endpoint such as a printer or laptop. It can terminate a physical trace, but does not invent a monitored IP, status or speed. Passive devices keep their separate Front / Rear continuity."
            ]
          }
        ]
      },
      "fr": {
        "title": "Ports manuels et équipements sans IP",
        "intro": "Documentez les connecteurs physiques même lorsque LibreNMS ne les supervise pas.",
        "sections": [
          {
            "title": "Créer le connecteur nécessaire",
            "steps": [
              "Pour un équipement passif, utilisez Device without IP dans Device ; Physical propose aussi Component. Choisissez le type, l’image et le nombre de ports.",
              "Sur un équipement existant, choisissez X → Create manual port. Donnez un nom distinct tel que NIC2, Console ou Stack1.",
              "Choisissez le type adapté : Ethernet, fibre, SFP, management, console, alimentation ou stack. Sélectionnez Single port ou Front / rear pair.",
              "Placez un point par connecteur réel, raccordez les ports nécessaires puis enregistrez la carte ou le plan."
            ]
          },
          {
            "note": "Manuel signifie Unmonitored. Une IP de gestion UP ne prouve pas l’état d’une carte réseau manuelle, d’un connecteur Stack ou d’un câble passif."
          },
          {
            "title": "Équipement actif sans supervision",
            "body": [
              "Choisissez Active device (unmonitored) pour une extrémité non supervisée, par exemple une imprimante ou un ordinateur. Elle peut terminer un tracé physique sans inventer d’IP, d’état ni de débit supervisés. Les équipements passifs conservent leur continuité Front / Rear."
            ]
          }
        ]
      }
    },
    {
      "id": "stack",
      "scopes": [
        "logical",
        "physical"
      ],
      "group": "build",
      "tags": "",
      "related": [
        "port-binding",
        "port-groups",
        "cable-details"
      ],
      "en": {
        "title": "Represent a switch stack",
        "intro": "A stack has one managed device and multiple member images, each with its own ports.",
        "sections": [
          {
            "title": "Add members and stack links",
            "steps": [
              "In Device, choose Stack, select the managed LibreNMS device and set the member number. Add each member with a different number.",
              "Use Member interfaces for recognized names such as Gi2/0/1 on member 2. With another naming scheme, use All unassigned interfaces and assign explicitly.",
              "Select the image and bind that member’s interfaces. A previously standalone placement becomes member 1 when represented as a stack.",
              "Create one manual Stack port for each physical stack socket. Connect sockets on different members, then set the cable type to Stack in Cable details.",
              "For a ring or two parallel stack links, use distinct sockets. Save and verify each member and connection."
            ]
          },
          {
            "note": "Stack cables default to purple. Color describes their presentation; manual stack ports remain Unmonitored. The same member number cannot be placed twice in one map."
          }
        ]
      },
      "fr": {
        "title": "Représenter une pile de commutateurs",
        "intro": "Une pile possède un périphérique supervisé et plusieurs images de membres, chacun avec ses ports.",
        "sections": [
          {
            "title": "Ajouter les membres et les liaisons Stack",
            "steps": [
              "Dans Device, choisissez Stack, le périphérique LibreNMS et le numéro du membre. Utilisez un numéro différent pour chaque membre.",
              "Utilisez Member interfaces pour les noms reconnus comme Gi2/0/1 sur le membre 2. Avec une autre nomenclature, choisissez All unassigned interfaces et affectez les ports explicitement.",
              "Choisissez l’image et associez les interfaces du membre. Un placement autonome existant devient membre 1 lors du passage en Stack.",
              "Créez un port manuel Stack par prise physique. Reliez les prises de membres différents, puis choisissez le type Stack dans Cable details.",
              "Pour un anneau ou deux liaisons parallèles, utilisez des prises distinctes. Enregistrez et vérifiez chaque membre et chaque connexion."
            ]
          },
          {
            "note": "Les câbles Stack sont violets par défaut. Cette couleur concerne leur présentation ; les ports Stack manuels restent Unmonitored. Un numéro de membre ne peut pas être placé deux fois sur une même carte."
          }
        ]
      }
    },
    {
      "id": "port-groups",
      "scopes": [
        "logical",
        "physical"
      ],
      "group": "build",
      "tags": "",
      "related": [
        "port-status",
        "stack"
      ],
      "en": {
        "title": "Bond / LAG and NIC Team",
        "intro": "Describe link aggregation on an existing device while keeping each physical cable visible.",
        "sections": [
          {
            "title": "Define a group",
            "steps": [
              "Select the device and choose Arrange → Port groups. Bond / LAG and NIC Team in Device also lead to this editor.",
              "Enter the name, group type and mode. Select the physical member interfaces. Each interface belongs to at most one group on that device.",
              "Optionally choose a monitored aggregate such as bond0 or Port-channel1. That aggregate cannot also be a physical member.",
              "Apply saves the group for both workspaces. Review the member UP, DOWN and Unknown counts in Properties."
            ]
          },
          {
            "note": "Without a monitored aggregate interface, the summary describes member availability. It does not establish LACP negotiation, traffic distribution or end-to-end service health."
          }
        ]
      },
      "fr": {
        "title": "Bond / LAG et NIC Team",
        "intro": "Décrivez l’agrégation de liens sur un périphérique existant en conservant chaque câble physique.",
        "sections": [
          {
            "title": "Définir un groupe",
            "steps": [
              "Sélectionnez le périphérique puis Arrange → Port groups. Bond / LAG et NIC Team dans Device ouvrent également cet éditeur.",
              "Saisissez le nom, le type et le mode. Sélectionnez les interfaces physiques membres. Une interface appartient au maximum à un groupe sur ce périphérique.",
              "Choisissez éventuellement une interface agrégée supervisée, comme bond0 ou Port-channel1. Elle ne peut pas être aussi un membre physique.",
              "Apply enregistre le groupe pour les deux espaces. Consultez les nombres de membres UP, DOWN et Unknown dans Properties."
            ]
          },
          {
            "note": "Sans interface agrégée supervisée, le résumé décrit la disponibilité des membres. Il ne prouve pas la négociation LACP, la répartition du trafic ni le fonctionnement du service de bout en bout."
          }
        ]
      }
    },
    {
      "id": "logical-page",
      "scopes": [
        "logical"
      ],
      "group": "build",
      "tags": "",
      "related": [
        "select-pan",
        "format-painter",
        "publish",
        "export"
      ],
      "en": {
        "title": "Page, device appearance and preview",
        "intro": "Give the diagram enough room, then format the equipment without changing its identity.",
        "sections": [
          {
            "title": "Arrange the map",
            "steps": [
              "Use Page size to set the logical canvas width and height. Fit page frames that page; Fit content frames the objects already placed.",
              "Select a device, then use Properties for its position and dimensions. Drag its resize handle to resize visually. Its port positions scale with the image.",
              "Right-click → Format device to adjust image opacity and label size, color and emphasis. Apply and Save. Format Painter transfers compatible appearance settings.",
              "Use Preview to inspect the map presentation, then return to editing with its toggle. Publish creates the separate saved viewer."
            ]
          }
        ]
      },
      "fr": {
        "title": "Page, apparence des périphériques et aperçu",
        "intro": "Prévoyez suffisamment d’espace, puis mettez en forme les équipements en conservant leur identité.",
        "sections": [
          {
            "title": "Organiser la carte",
            "steps": [
              "Utilisez Page size pour régler la largeur et la hauteur de la page logique. Fit page cadre la page ; Fit content cadre les objets placés.",
              "Sélectionnez un périphérique puis utilisez Properties pour sa position et ses dimensions. Sa poignée permet un redimensionnement visuel. Les positions des ports suivent l’image.",
              "Clic droit → Format device permet de régler l’opacité de l’image, la taille, la couleur et la graisse du libellé. Validez et enregistrez. Format Painter copie les réglages compatibles.",
              "Utilisez Preview pour examiner la présentation puis revenez à l’édition avec ce même bouton. Publish crée la publication distincte."
            ]
          }
        ]
      }
    },
    {
      "id": "asset-import",
      "scopes": [
        "library"
      ],
      "group": "build",
      "tags": "",
      "related": [
        "asset-positions",
        "asset-export",
        "asset-troubleshooting"
      ],
      "en": {
        "title": "Import images and stencil packages",
        "intro": "Use your own equipment artwork or a MorMap package containing an image and saved connection positions.",
        "sections": [
          {
            "title": "Import and inspect",
            "steps": [
              "Choose Import and select SVG, PNG, JPEG, WebP or a MorMap .json stencil package.",
              "The package limit is 8 MB; image content is limited to 5 MB. A web server or PHP upload limit may be lower.",
              "Inspect the preview, proportions and existing points. SVG stays sharp while zooming; raster images depend on their source resolution.",
              "Give the asset a clear name, add or adjust its positions, then Save. Use Export to keep a reusable package."
            ]
          },
          {
            "title": "Use artwork from Visio",
            "body": [
              "For a Visio .vss / .vssx stencil, place the desired shape on a drawing page and export it as SVG from Visio. Import that SVG here, inspect its proportions and add the connection positions."
            ]
          },
          {
            "note": "A stencil JSON package is an asset exchange format. It is different from a map’s MorMap JSON output."
          }
        ]
      },
      "fr": {
        "title": "Importer images et paquets de modèles",
        "intro": "Utilisez vos images d’équipements ou un paquet MorMap contenant image et positions de connexion.",
        "sections": [
          {
            "title": "Importer et vérifier",
            "steps": [
              "Choisissez Import et sélectionnez SVG, PNG, JPEG, WebP ou un paquet de modèle MorMap .json.",
              "La limite du paquet est de 8 Mo ; le contenu image est limité à 5 Mo. Le serveur web ou PHP peut imposer une limite inférieure.",
              "Vérifiez l’aperçu, les proportions et les points existants. Le SVG reste net au zoom ; les images matricielles dépendent de leur résolution d’origine.",
              "Donnez un nom clair, ajoutez ou ajustez les positions puis Save. Export permet de conserver un paquet réutilisable."
            ]
          },
          {
            "title": "Utiliser une forme Visio",
            "body": [
              "Pour un modèle Visio .vss / .vssx, placez la forme sur une page de dessin puis exportez-la en SVG depuis Visio. Importez ce SVG ici, vérifiez ses proportions et ajoutez les positions de connexion."
            ]
          },
          {
            "note": "Un paquet de modèle JSON sert à échanger un asset. Il est différent de l’export MorMap JSON d’une carte."
          }
        ]
      }
    },
    {
      "id": "asset-positions",
      "scopes": [
        "library"
      ],
      "group": "build",
      "tags": "",
      "related": [
        "asset-navigation",
        "asset-replace",
        "port-binding"
      ],
      "en": {
        "title": "Place, name and align connection positions",
        "intro": "Put points directly on the equipment sockets. Positions remain proportional when the image is resized.",
        "sections": [
          {
            "title": "Edit the template points",
            "steps": [
              "Select an asset and activate X. Click the image once for each connection position.",
              "Edit each label in Properties. Use a consistent order matching the physical equipment, such as ports 1–24 followed by uplinks.",
              "Choose Select or turn X off. Drag a point to adjust it. Snap aligns with nearby rows or columns; hold Alt for free positioning.",
              "Open Align points, select the positions and preview row/column alignment or equal spacing. Apply only after checking the preview.",
              "Select a point and use Delete point to remove that template position. Save retains the point list and labels."
            ]
          },
          {
            "note": "Saving template positions prepares future placements. Existing mapped devices retain their own positions and bindings. Use Bind image ports in a map to repair missing positions, or Replace everywhere for a deliberate replacement across existing uses."
          }
        ]
      },
      "fr": {
        "title": "Placer, nommer et aligner les positions",
        "intro": "Placez les points directement sur les prises. Leurs positions restent proportionnelles au redimensionnement de l’image.",
        "sections": [
          {
            "title": "Modifier les points du modèle",
            "steps": [
              "Sélectionnez un modèle et activez X. Cliquez une fois par position de connexion.",
              "Modifiez les libellés dans Properties. Utilisez un ordre cohérent avec l’équipement, par exemple ports 1–24 puis uplinks.",
              "Choisissez Select ou désactivez X. Glissez un point pour l’ajuster. Snap l’aligne sur les lignes ou colonnes proches ; Alt permet un placement libre.",
              "Ouvrez Align points, sélectionnez les positions et prévisualisez alignement horizontal/vertical ou espacement régulier. Vérifiez l’aperçu puis validez.",
              "Sélectionnez un point puis Delete point pour retirer cette position du modèle. Save conserve la liste et les libellés."
            ]
          },
          {
            "note": "Les positions enregistrées préparent les futurs placements. Les périphériques déjà placés conservent leurs positions et associations. Utilisez Bind image ports pour compléter un appareil ou Replace everywhere pour un remplacement volontaire de ses utilisations."
          }
        ]
      }
    },
    {
      "id": "asset-format",
      "scopes": [
        "library"
      ],
      "group": "build",
      "tags": "",
      "related": [
        "asset-positions",
        "format-painter",
        "asset-replace"
      ],
      "en": {
        "title": "Image appearance and Format Painter",
        "intro": "Set a consistent default appearance for reusable images and copy it to other assets.",
        "sections": [
          {
            "title": "Format and copy",
            "steps": [
              "Select an asset and open Format image. Adjust image opacity and the label’s size, color and emphasis. Apply.",
              "With the source selected, click Format Painter, then a target asset card or preview. Alternatively start with the brush, choose the source, then the target.",
              "Double-click the brush to apply to several assets. Escape stops painting. Ctrl/Cmd+Shift+C and Ctrl/Cmd+Shift+V also copy and paste compatible appearance.",
              "Undo / Redo reverses or repeats the last fifty appearance, position and deletion actions. Save writes the pending appearance changes, including changes to multiple assets."
            ]
          },
          {
            "note": "Painter copies appearance, not the source image or its point positions. New placements use saved defaults; existing maps keep their own formatting and bindings."
          }
        ]
      },
      "fr": {
        "title": "Apparence des images et Format Painter",
        "intro": "Définissez une apparence initiale cohérente et copiez-la vers d’autres modèles.",
        "sections": [
          {
            "title": "Mettre en forme et copier",
            "steps": [
              "Sélectionnez un modèle puis Format image. Réglez l’opacité et la taille, couleur et graisse du libellé. Validez.",
              "Avec la source sélectionnée, cliquez sur Format Painter puis sur la carte ou l’aperçu d’une cible. Vous pouvez aussi activer le pinceau puis choisir source et cible.",
              "Double-cliquez le pinceau pour plusieurs modèles. Escape termine. Ctrl/Cmd+Shift+C et Ctrl/Cmd+Shift+V copient et collent aussi l’apparence compatible.",
              "Undo / Redo annule ou rétablit les cinquante dernières actions de style, position ou suppression. Save enregistre les modifications en attente, y compris pour plusieurs modèles."
            ]
          },
          {
            "note": "Le pinceau copie l’apparence, pas l’image source ni ses positions. Les nouveaux placements utilisent le style enregistré ; les cartes existantes conservent leurs styles et associations."
          }
        ]
      }
    },
    {
      "id": "cable-create",
      "scopes": [
        "logical",
        "physical"
      ],
      "group": "cables",
      "tags": "Use orthogonal cable segments",
      "related": [
        "cable-routing",
        "cable-format",
        "physical-connections",
        "port-status"
      ],
      "en": {
        "title": "Connect ports and choose a cable type",
        "intro": "A cable joins two exact connection points. Its route and visual style can then be edited independently.",
        "sections": [
          {
            "title": "Create a connection",
            "steps": [
              "Choose Cable, then click the source X point. Click intermediate waypoints if you need a specific route; finish by clicking the destination point.",
              "Right-click the cable and choose Right-Angle Connector, Straight Connector or Curved Connector.",
              "Select the cable to reveal its segment, bend or curve controls. Use Format Cable for its appearance and Cable details for descriptive information.",
              "Save, then verify the two endpoint devices and ports. Physical Connections can also connect placed ports across locations."
            ]
          },
          {
            "title": "Connector styles",
            "table": {
              "head": [
                "Style",
                "Meaning"
              ],
              "rows": [
                [
                  "Right-Angle / orthogonal",
                  "Horizontal and vertical segments joined at right angles. Orthogonal describes geometry, not a cable technology."
                ],
                [
                  "Straight",
                  "A straight route between the endpoints."
                ],
                [
                  "Curved",
                  "A curve shaped using its control handles."
                ]
              ]
            }
          }
        ]
      },
      "fr": {
        "title": "Raccorder les ports et choisir un tracé",
        "intro": "Un câble relie deux points de connexion précis. Son tracé et son style se modifient ensuite séparément.",
        "sections": [
          {
            "title": "Créer une connexion",
            "steps": [
              "Choisissez Cable, puis cliquez sur le point X source. Ajoutez des points de passage si nécessaire ; terminez en cliquant sur le point de destination.",
              "Faites un clic droit sur le câble puis choisissez Right-Angle Connector, Straight Connector ou Curved Connector.",
              "Sélectionnez le câble pour afficher ses segments, coudes ou poignées de courbe. Format Cable règle l’apparence ; Cable details contient les informations descriptives.",
              "Enregistrez puis vérifiez les périphériques et ports aux deux extrémités. Dans Physical, Connections permet aussi de relier des ports placés dans des lieux différents."
            ]
          },
          {
            "title": "Types de tracé",
            "table": {
              "head": [
                "Type",
                "Signification"
              ],
              "rows": [
                [
                  "Right-Angle / orthogonal",
                  "Segments horizontaux et verticaux à angle droit. Orthogonal décrit la géométrie, pas une technologie de câble."
                ],
                [
                  "Straight",
                  "Un tracé droit entre les extrémités."
                ],
                [
                  "Curved",
                  "Une courbe réglée avec ses poignées de contrôle."
                ]
              ]
            }
          }
        ]
      }
    },
    {
      "id": "cable-routing",
      "scopes": [
        "logical",
        "physical"
      ],
      "group": "cables",
      "tags": "",
      "related": [
        "cable-format",
        "physical-shared-routes",
        "format-painter"
      ],
      "en": {
        "title": "Route cables by hand",
        "intro": "Use visible handles to make cables follow the path you want, without changing their endpoint ports.",
        "sections": [
          {
            "title": "Adjust an existing cable",
            "steps": [
              "Select the cable. Drag a segment or bend for a right-angle path, or the control handles for a curve.",
              "Double-click a right-angle segment to create a detour. Alt + double-click the middle segment of the detour removes it. The context menu also provides Add bend here and Move segment.",
              "For a complete new path, choose Redraw route. Click waypoints; Shift chooses vertical-first routing and Backspace removes the latest waypoint.",
              "Press Enter to finish redrawing an existing cable. A new cable finishes on its destination port. Escape cancels the unfinished route. Save after completing the edit."
            ]
          },
          {
            "note": "Corner rounding softens bends; it does not add waypoints. For an intra-rack cable in Physical, the rack route is shared with its higher-level cabling projections."
          }
        ]
      },
      "fr": {
        "title": "Tracer les câbles à la main",
        "intro": "Utilisez les poignées visibles pour dessiner le chemin souhaité tout en conservant les ports aux extrémités.",
        "sections": [
          {
            "title": "Ajuster un câble existant",
            "steps": [
              "Sélectionnez le câble. Déplacez un segment ou un coude pour un tracé orthogonal, ou les poignées pour une courbe.",
              "Double-cliquez sur un segment orthogonal pour créer un détour. Alt + double-clic sur son segment central le supprime. Le menu contextuel propose aussi Add bend here et Move segment.",
              "Pour refaire tout le chemin, choisissez Redraw route. Cliquez les points de passage ; Shift privilégie la verticale et Backspace retire le dernier point.",
              "Appuyez sur Enter pour terminer le nouveau tracé d’un câble existant. Un nouveau câble se termine sur son port cible. Escape annule le tracé en cours. Enregistrez après modification."
            ]
          },
          {
            "note": "Corner rounding arrondit les coudes sans ajouter de points de passage. Dans Physical, le tracé d’un câble interne à une baie est partagé avec ses projections de câblage aux niveaux supérieurs."
          }
        ]
      }
    },
    {
      "id": "cable-format",
      "scopes": [
        "logical",
        "physical"
      ],
      "group": "cables",
      "tags": "",
      "related": [
        "format-painter",
        "port-status",
        "cable-details"
      ],
      "en": {
        "title": "Style a cable",
        "intro": "Format Cable controls the line’s appearance. Cable details stores its reference and physical description.",
        "sections": [
          {
            "title": "Set a precise appearance",
            "steps": [
              "Right-click a cable → Format Cable. Use its preview while changing the settings.",
              "For a fixed red line, clear Automatic status color and set Line color to #ff0000. For a gradient, choose the gradient line style and an End color.",
              "Set Width in pt and Corner rounding in px. Adjust transparency, dash pattern, compound line, cap, join and beginning/end arrows as needed.",
              "Apply, inspect the cable and Save. Undo reverses the edit. Use Format Painter to copy this appearance to other cables."
            ]
          },
          {
            "note": "A fixed color changes the drawing, not the reported network state. Automatic status color must be disabled when you want your chosen color to remain visible."
          }
        ]
      },
      "fr": {
        "title": "Mettre en forme un câble",
        "intro": "Format Cable règle l’apparence du trait. Cable details conserve sa référence et sa description physique.",
        "sections": [
          {
            "title": "Définir une apparence précise",
            "steps": [
              "Faites un clic droit sur le câble → Format Cable. Observez l’aperçu pendant les réglages.",
              "Pour un trait rouge fixe, décochez Automatic status color et choisissez #ff0000 dans Line color. Pour un dégradé, choisissez le style gradient et une End color.",
              "Réglez Width en pt et Corner rounding en px. Ajustez la transparence, les pointillés, les traits composés, les extrémités, les jonctions et les flèches.",
              "Validez, vérifiez le câble puis enregistrez. Undo annule la modification. Format Painter copie cette apparence vers d’autres câbles."
            ]
          },
          {
            "note": "Une couleur fixe modifie le dessin, pas l’état réseau remonté. Désactivez Automatic status color pour conserver visuellement la couleur choisie."
          }
        ]
      }
    },
    {
      "id": "format-painter",
      "scopes": [
        "logical",
        "physical"
      ],
      "group": "cables",
      "tags": "paint brush colour corners rounding multi paste pinceau couleur arrondi",
      "related": [
        "cable-format",
        "select-pan",
        "asset-format"
      ],
      "en": {
        "title": "Format Painter: one cable or many",
        "intro": "Copy a finished appearance to compatible targets. Device identities, port bindings and cable endpoints remain attached to their own objects.",
        "sections": [
          {
            "title": "Example: red, 10 px corners, ten targets",
            "steps": [
              "Right-click the source cable → Format Cable. Disable Automatic status color, set red, Corner rounding 10 px and the desired Width, then Apply.",
              "Click a visible segment of that cable to select it. A single click on Format Painter prepares one target; a double-click locks the brush for repeated targets.",
              "Click the visible line of each target cable. With the locked brush, repeat for all ten targets. Follow the source/target message at the bottom.",
              "Press Escape to stop, then Save. Select a target and open Format Cable to check the copied values."
            ]
          },
          {
            "title": "Apply to a selection in one operation",
            "steps": [
              "Select the source and press Ctrl/Cmd+Shift+C. Select compatible targets with Ctrl/Cmd/Shift-click or a selection rectangle.",
              "Press Ctrl/Cmd+Shift+V. This batch is one Undo operation. The copied style can also be used in another workspace in the same browser tab."
            ]
          },
          {
            "title": "What is copied?",
            "body": [
              "For cables: color mode, color, width, rounding, transparency, dashes, arrows and connector type. Same-type targets keep their manual routes. A different connector type creates a compatible route between the target’s own ports.",
              "You can also start with the brush, then choose source and target. A cable caption selects its cable. An Info source carries text styling and cable styling: an Info target gets the text style, a cable target gets the cable appearance. Objects and drawings accept their corresponding visual formatting."
            ]
          }
        ]
      },
      "fr": {
        "title": "Format Painter : un câble ou plusieurs",
        "intro": "Copiez une mise en forme terminée vers des cibles compatibles. Chaque objet conserve son identité, ses ports et ses extrémités.",
        "sections": [
          {
            "title": "Exemple : rouge, angles de 10 px, dix cibles",
            "steps": [
              "Clic droit sur le câble source → Format Cable. Désactivez Automatic status color, choisissez le rouge, Corner rounding 10 px et la largeur souhaitée, puis Apply.",
              "Cliquez sur un segment visible du câble pour le sélectionner. Un clic sur Format Painter prépare une cible ; un double-clic verrouille le pinceau pour plusieurs cibles.",
              "Cliquez sur le trait visible de chaque câble cible. Avec le pinceau verrouillé, répétez pour les dix câbles. Le message en bas indique la source ou la cible attendue.",
              "Appuyez sur Escape pour terminer, puis Save. Sélectionnez une cible et ouvrez Format Cable pour vérifier les valeurs copiées."
            ]
          },
          {
            "title": "Appliquer à une sélection en une opération",
            "steps": [
              "Sélectionnez la source puis Ctrl/Cmd+Shift+C. Sélectionnez les cibles compatibles avec Ctrl/Cmd/Shift-clic ou un rectangle de sélection.",
              "Appuyez sur Ctrl/Cmd+Shift+V. Ce lot correspond à une seule opération Undo. Le style copié peut aussi être utilisé dans un autre espace du même onglet de navigateur."
            ]
          },
          {
            "title": "Que copie le pinceau ?",
            "body": [
              "Pour les câbles : mode de couleur, couleur, largeur, arrondi, transparence, pointillés, flèches et type de connecteur. Une cible de même type conserve son tracé manuel. Un autre type crée un tracé compatible entre ses propres ports.",
              "Vous pouvez activer le pinceau avant de choisir source et cible. Le libellé d’un câble sélectionne ce câble. Une source Info contient le style du texte et du câble : une cible Info reçoit le style du texte, une cible câble reçoit celui du câble. Objets et dessins acceptent leur mise en forme correspondante."
            ]
          }
        ]
      }
    },
    {
      "id": "cable-details",
      "scopes": [
        "logical",
        "physical"
      ],
      "group": "cables",
      "tags": "",
      "related": [
        "format-painter",
        "physical-links",
        "export"
      ],
      "en": {
        "title": "Cable details, Info and comments",
        "intro": "Keep a short label on the drawing and the detailed connection information with the cable.",
        "sections": [
          {
            "title": "Describe the connection",
            "steps": [
              "Right-click → Cable details. Enter the name, cable kind, reference and comment. For fibre, fill the relevant fibre type, connector, capacity, used/reserved strands, length and route fields.",
              "Review endpoints before applying. Used plus reserved strands must fit within the declared strand capacity.",
              "Use Fix info here to pin the cable information on the canvas. Drag the card to adjust its position and use Info size or its formatting controls for readability.",
              "Use comments for longer notes. Open a comment marker to read it; move the marker or expanded note as needed. Save the result."
            ]
          },
          {
            "note": "Pinned Info follows its cable when equipment moves. In multiline comment fields, Enter creates a line break and Ctrl/Cmd+Enter applies the form."
          }
        ]
      },
      "fr": {
        "title": "Détails du câble, Info et commentaires",
        "intro": "Conservez un libellé court sur le dessin et les informations détaillées avec le câble.",
        "sections": [
          {
            "title": "Décrire la connexion",
            "steps": [
              "Clic droit → Cable details. Saisissez le nom, le type, la référence et le commentaire. Pour la fibre, renseignez les champs utiles : type, connecteur, capacité, brins utilisés/réservés, longueur et parcours.",
              "Vérifiez les extrémités avant validation. La somme des brins utilisés et réservés doit respecter la capacité déclarée.",
              "Utilisez Fix info here pour épingler les informations sur le dessin. Déplacez la carte pour ajuster sa position et utilisez Info size ou ses réglages de style pour la lisibilité.",
              "Utilisez les commentaires pour les notes longues. Ouvrez le marqueur pour les lire ; déplacez le marqueur ou la note développée si nécessaire. Enregistrez."
            ]
          },
          {
            "note": "L’Info épinglée suit son câble lors du déplacement des équipements. Dans un commentaire multiligne, Enter ajoute une ligne et Ctrl/Cmd+Enter valide le formulaire."
          }
        ]
      }
    },
    {
      "id": "physical-shared-routes",
      "scopes": [
        "physical"
      ],
      "group": "cables",
      "tags": "",
      "related": [
        "physical-racks",
        "cable-routing",
        "format-painter",
        "physical-links"
      ],
      "en": {
        "title": "Layout, Cabling view and shared rack routes",
        "intro": "Choose the view that matches the task: spatial layout or detailed rack-front cabling.",
        "sections": [
          {
            "title": "Switch between the views",
            "body": [
              "Entering a ServerRoom containing racks opens their full fronts and cables. Cabling view switches between expanded cabling and the spatial layout; the choice is remembered for each location. Double-click a rack frame to enter it.",
              "An intra-rack cable keeps the same bends, curve, connector type, appearance and pinned Info in Rack and its ServerRoom, Floor, Building and Site cabling projections. Editing its curve in either view updates the shared rack route.",
              "Cables between different racks keep view-specific routes. Logical diagrams also keep their own presentation; Logical connections are independent of Physical cable identities and routes."
            ]
          },
          {
            "note": "For older documents with conflicting paths, the saved Rack path takes precedence. If absent, an existing projected route is converted to rack coordinates; legacy route entries remain in the document."
          }
        ]
      },
      "fr": {
        "title": "Layout, Cabling view et tracés partagés",
        "intro": "Choisissez la vue adaptée : disposition des lieux ou câblage détaillé des faces de baies.",
        "sections": [
          {
            "title": "Passer d’une vue à l’autre",
            "body": [
              "L’entrée dans un ServerRoom avec baies affiche leurs faces et câbles. Cabling view alterne entre câblage détaillé et disposition des lieux ; le choix est mémorisé par lieu. Double-cliquez sur le cadre d’une baie pour y entrer.",
              "Un câble interne à une baie garde ses coudes, courbe, type, apparence et Info épinglée dans Rack et ses projections Cabling de ServerRoom, Floor, Building et Site. Modifier sa courbe dans l’une de ces vues actualise le tracé de la baie.",
              "Les câbles entre baies différentes conservent des tracés propres à chaque vue. Les cartes Logical gardent aussi leur présentation ; une identité commune n’impose pas une géométrie unique partout."
            ]
          },
          {
            "note": "Pour un ancien document avec plusieurs tracés contradictoires, le tracé Rack est prioritaire. À défaut, un tracé projeté existant est converti en coordonnées de baie ; les anciens tracés restent conservés dans le document."
          }
        ]
      }
    },
    {
      "id": "physical-continuity",
      "scopes": [
        "physical"
      ],
      "group": "cables",
      "tags": "",
      "related": [
        "manual-ports",
        "physical-trace",
        "physical-connections"
      ],
      "en": {
        "title": "Patch panels and Front / Rear continuity",
        "intro": "A passive connector can pass a documented path through a paired front and rear termination.",
        "sections": [
          {
            "title": "Document a panel or outlet",
            "steps": [
              "Add the passive equipment with Component or Device without IP. Patch panels, fibre panels and wall outlets can use paired terminations.",
              "Create a Front / rear pair for each real pass-through port. Each side is a separate termination. Additional cables remain possible with an ambiguity or loop warning.",
              "For co-located pairs, use the visible point and its Side selector to choose Front or Rear. Older separately positioned front/rear points keep their positions.",
              "Connect the incoming and outgoing cables to the appropriate sides. Save and use Trace Physical Path to check continuity from one monitored endpoint to the other."
            ]
          },
          {
            "note": "Passive continuity is documentation, not active switch forwarding. Hidden connection points remain hidden; an incomplete or conflicting pair is reported by Trace."
          }
        ]
      },
      "fr": {
        "title": "Panneaux de brassage et continuité Front / Rear",
        "intro": "Un connecteur passif peut prolonger un chemin documenté via une paire de terminaisons avant et arrière.",
        "sections": [
          {
            "title": "Documenter un panneau ou une prise",
            "steps": [
              "Ajoutez l’équipement passif avec Component ou Device without IP. Les panneaux cuivre/fibre et prises murales peuvent utiliser des terminaisons jumelées.",
              "Créez une paire Front / rear par port traversant réel. Chaque face possède sa terminaison. Des câbles supplémentaires restent possibles avec un avertissement de chemin ambigu ou de boucle.",
              "Pour une paire superposée, utilisez le point visible et le sélecteur Side pour choisir Front ou Rear. Les anciennes positions avant/arrière séparées restent distinctes.",
              "Reliez les câbles entrant et sortant aux faces appropriées. Enregistrez et utilisez Trace Physical Path pour vérifier la continuité entre les extrémités supervisées."
            ]
          },
          {
            "note": "La continuité passive est une documentation, pas une commutation réseau active. Les points masqués restent masqués ; Trace signale une paire incomplète ou incohérente."
          }
        ]
      }
    },
    {
      "id": "physical-connections",
      "scopes": [
        "physical"
      ],
      "group": "cables",
      "tags": "",
      "related": [
        "physical-links",
        "physical-trace",
        "save-documents"
      ],
      "en": {
        "title": "Connect locations and remote plans",
        "intro": "Connections selects exact placed ports across a plan. Remote link connects a termination to another saved physical plan.",
        "sections": [
          {
            "title": "Within the same plan",
            "steps": [
              "Choose Connections and select the source and destination equipment/ports, even when they are in different locations.",
              "Review availability and endpoints, create the connection and fill its Cable details. Save.",
              "At higher levels, inspect the location link or open the endpoint location to see the detailed cable."
            ]
          },
          {
            "title": "Between saved plans",
            "steps": [
              "Save the local and remote plans so their terminations are available. Select the local termination and choose Remote link.",
              "Choose the saved remote termination and verify both endpoint names, ports and location paths. Apply creates the shared connection immediately.",
              "Use Trace or Open location to follow the remote endpoint. Use Disconnect when the shared remote link itself must be removed."
            ]
          },
          {
            "note": "Remote connections are saved immediately and participate in the same fifty-action Undo / Redo history. A conflicting newer connection is reported instead of overwritten."
          }
        ]
      },
      "fr": {
        "title": "Relier des lieux et des plans distants",
        "intro": "Connections sélectionne les ports placés dans un plan. Remote link relie une terminaison à un autre plan physique enregistré.",
        "sections": [
          {
            "title": "Dans le même plan",
            "steps": [
              "Choisissez Connections et sélectionnez équipements et ports source/cible, même situés dans des lieux différents.",
              "Vérifiez disponibilité et extrémités, créez la connexion et renseignez Cable details. Enregistrez.",
              "Aux niveaux supérieurs, consultez le lien entre lieux ou ouvrez l’emplacement d’une extrémité pour voir le câble détaillé."
            ]
          },
          {
            "title": "Entre plans enregistrés",
            "steps": [
              "Enregistrez les plans local et distant pour rendre leurs terminaisons disponibles. Sélectionnez la terminaison locale puis Remote link.",
              "Choisissez la terminaison distante et vérifiez noms, ports et chemins de localisation. Apply crée immédiatement la connexion partagée.",
              "Utilisez Trace ou Open location pour suivre l’extrémité distante. Disconnect permet de retirer la liaison distante partagée."
            ]
          },
          {
            "note": "Les liaisons distantes sont enregistrées immédiatement et participent au même historique de cinquante actions Undo / Redo. Une connexion plus récente en conflit est signalée et conservée."
          }
        ]
      }
    },
    {
      "id": "port-status",
      "scopes": [
        "logical",
        "physical"
      ],
      "group": "inspect",
      "tags": "Multiple connections on this port in the shared infrastructure green unconnected orange",
      "related": [
        "port-hover",
        "physical-trace",
        "port-troubleshooting"
      ],
      "en": {
        "title": "Read port status and connection state",
        "intro": "Monitoring and documented connectivity are different pieces of information. Read both before deciding whether a port is free.",
        "sections": [
          {
            "title": "Understand the distinction",
            "table": {
              "head": [
                "Information",
                "Meaning"
              ],
              "rows": [
                [
                  "UP / DOWN",
                  "The last interface state reported by LibreNMS. Refresh status reads the latest available poll; it does not poll the switch itself."
                ],
                [
                  "Connected / Unconnected",
                  "Whether the documented cable/path is connected in MorMap. This is separate from the port’s monitored color."
                ],
                [
                  "Occupied port",
                  "A shared cable already uses this exact interface, possibly in another location or map."
                ],
                [
                  "Unknown / Unmonitored",
                  "Missing or unavailable status, or a manual/passive connector without interface monitoring."
                ]
              ]
            }
          },
          {
            "title": "When a green port appears unconnected",
            "steps": [
              "Inspect the exact port binding. Green can indicate an UP interface without a documented MorMap cable.",
              "An already connected port remains selectable. Adding a connection retains its existing cables and displays an advisory when the path becomes ambiguous. Inspect Connections or Trace Physical Path to review it; use Disconnect when removal is intended."
            ]
          }
        ]
      },
      "fr": {
        "title": "Lire l’état d’un port et de sa connexion",
        "intro": "La supervision et la connexion documentée sont deux informations distinctes. Consultez les deux pour savoir si un port est libre.",
        "sections": [
          {
            "title": "Comprendre la différence",
            "table": {
              "head": [
                "Information",
                "Signification"
              ],
              "rows": [
                [
                  "UP / DOWN",
                  "Le dernier état d’interface remonté par LibreNMS. Refresh status relit ce relevé ; il ne lance pas un sondage du commutateur."
                ],
                [
                  "Connected / Unconnected",
                  "L’état du raccordement documenté dans MorMap, distinct de la couleur de supervision du port."
                ],
                [
                  "Port occupé",
                  "Un câble partagé utilise déjà cette interface précise, éventuellement dans un autre lieu ou une autre carte."
                ],
                [
                  "Unknown / Unmonitored",
                  "Un état absent ou indisponible, ou un connecteur manuel/passif sans supervision d’interface."
                ]
              ]
            }
          },
          {
            "title": "Si un port vert semble non raccordé",
            "steps": [
              "Vérifiez l’association exacte. Le vert peut indiquer une interface UP sans câble documenté dans MorMap.",
              "Un port déjà connecté reste sélectionnable. Une connexion supplémentaire conserve les câbles existants et affiche un avertissement si le chemin devient ambigu. Consultez Connections ou Trace Physical Path ; utilisez Disconnect si vous souhaitez supprimer un câble."
            ]
          }
        ]
      }
    },
    {
      "id": "port-hover",
      "scopes": [
        "logical",
        "physical"
      ],
      "group": "inspect",
      "tags": "",
      "related": [
        "port-status",
        "port-troubleshooting"
      ],
      "en": {
        "title": "VLANs and LLDP/CDP neighbors",
        "intro": "Hover a connection point to read the details available for its bound interface.",
        "sections": [
          {
            "title": "Fields in the port card",
            "table": {
              "head": [
                "Field",
                "Read it as"
              ],
              "rows": [
                [
                  "Device / port / management IP",
                  "One heading identifies the local endpoint."
                ],
                [
                  "Mode and VLANs",
                  "Discovered mode, all VLAN IDs, tagged/untagged membership, native/PVID and voice information when reported. Consecutive IDs appear as ranges."
                ],
                [
                  "LLDP / CDP",
                  "Protocol, neighbor name, resolved IP and remote interface when available."
                ],
                [
                  "Interface details",
                  "Description, speed, duplex and interface addresses supplied by LibreNMS."
                ]
              ]
            }
          },
          {
            "title": "Missing or inferred information",
            "body": [
              "Scroll a long card and press Escape to close it. Repeated hover can reuse a recent response for 30 seconds.",
              "“Not reported by LibreNMS” means the data is unavailable, not that the switch lacks that feature. Inferred Access is labelled explicitly. Discovery information is not a full switch configuration."
            ]
          }
        ]
      },
      "fr": {
        "title": "VLAN et voisins LLDP/CDP",
        "intro": "Survolez un point de connexion pour consulter les informations de son interface associée.",
        "sections": [
          {
            "title": "Champs de la fiche du port",
            "table": {
              "head": [
                "Champ",
                "Lecture"
              ],
              "rows": [
                [
                  "Périphérique / port / IP de gestion",
                  "Un titre unique identifie l’extrémité locale."
                ],
                [
                  "Mode et VLAN",
                  "Mode découvert, tous les VLAN, appartenances tagged/untagged, natif/PVID et voix si disponibles. Les identifiants consécutifs sont regroupés en plages."
                ],
                [
                  "LLDP / CDP",
                  "Protocole, nom du voisin, IP résolue et interface distante lorsqu’ils sont disponibles."
                ],
                [
                  "Détails de l’interface",
                  "Description, débit, duplex et adresses remontés par LibreNMS."
                ]
              ]
            }
          },
          {
            "title": "Informations manquantes ou déduites",
            "body": [
              "Faites défiler une fiche longue et utilisez Escape pour la fermer. Les survols rapprochés peuvent réutiliser une réponse pendant 30 secondes.",
              "« Not reported by LibreNMS » signifie que la donnée est indisponible, sans prouver l’absence de la fonction. Un mode Access déduit est signalé. La découverte ne représente pas toute la configuration du commutateur."
            ]
          }
        ]
      }
    },
    {
      "id": "physical-links",
      "scopes": [
        "physical"
      ],
      "group": "inspect",
      "tags": "",
      "related": [
        "physical-connections",
        "physical-trace",
        "cable-details"
      ],
      "en": {
        "title": "Read links at every hierarchy level",
        "intro": "Overview lines summarize actual endpoint cables between the visible locations.",
        "sections": [
          {
            "title": "Inspect a grouped link",
            "steps": [
              "Open the Site overview, Site, Building, Floor, ServerRoom or Rack level. Links are projected from documented endpoint locations.",
              "Select a link to see its actual cables, endpoint devices, ports and full location paths. The summary includes available UP, DOWN and Unknown counts.",
              "Use Expand for individual cables, or Open source / Open target to enter the endpoint location.",
              "Review Cable details for fibre references, connectors, strand use/reservation and the documented route. Refresh status updates monitoring counts."
            ]
          },
          {
            "note": "A line between buildings does not create an extra device-to-device connection. It represents the underlying cables. A passive or reserve cable without monitored endpoints remains Unmonitored."
          }
        ]
      },
      "fr": {
        "title": "Lire les liens à chaque niveau",
        "intro": "Les lignes de synthèse regroupent les câbles réels entre les lieux visibles.",
        "sections": [
          {
            "title": "Inspecter un lien groupé",
            "steps": [
              "Ouvrez la vue générale, Site, Building, Floor, ServerRoom ou Rack. Les liens proviennent des emplacements documentés des extrémités.",
              "Sélectionnez un lien pour consulter ses câbles, périphériques, ports et chemins complets. Le résumé présente les comptes UP, DOWN et Unknown disponibles.",
              "Utilisez Expand pour voir les câbles séparément, ou Open source / Open target pour rejoindre une extrémité.",
              "Consultez Cable details pour les références fibre, connecteurs, brins utilisés/réservés et parcours. Refresh status actualise les comptes de supervision."
            ]
          },
          {
            "note": "Une ligne entre bâtiments ne crée pas une connexion supplémentaire entre périphériques. Elle représente les câbles sous-jacents. Un câble passif ou de réserve sans extrémité supervisée reste Unmonitored."
          }
        ]
      }
    },
    {
      "id": "physical-trace",
      "scopes": [
        "physical"
      ],
      "group": "inspect",
      "tags": "",
      "related": [
        "physical-continuity",
        "physical-connections",
        "port-status"
      ],
      "en": {
        "title": "Trace a complete physical path",
        "intro": "Follow real cables and paired passive terminations from one endpoint to the next.",
        "sections": [
          {
            "title": "Open and read a trace",
            "steps": [
              "Right-click a port or cable → Trace Physical Path, or select an endpoint and choose Trace in View. It works at every physical hierarchy level.",
              "Read the ordered list: endpoint, cable, passive Front/Rear continuity, next cable and final endpoint. Inspect the actual device/port and location at each step.",
              "Use Open location to navigate to a saved endpoint, including one in another plan. Move, resize or minimize the Trace window while keeping Properties available.",
              "If the path is open, inspect the last connected termination. Invalid continuity, conflicting cables and loops are shown explicitly; correct the documented connection and trace again."
            ]
          },
          {
            "note": "Connected means the documented physical continuity is complete. Endpoint monitoring describes the last polled interfaces; Trace does not test optical power, signal quality or packet forwarding."
          },
          {
            "title": "Passive ports and verification",
            "body": [
              "Hover over either side of a passive port: Front is listed first, then Rear. Each side shows the directly connected termination and the final active endpoint, with management IP, monitoring and location. Incomplete documentation is shown as Unknown endpoint.",
              "MorMap placement supplies Site / Building / Floor / ServerRoom / Rack. If no placement is documented, LibreNMS location is shown as reported. It is not guessed or split into artificial hierarchy fields.",
              "Matched means LLDP / CDP agrees with the final active endpoints. Mismatch means a different endpoint is reported. Not Verified means the path or discovery data is incomplete. Discovery does not prove the intermediate passive cabling.",
              "Fibre cable details retain strand counts and add fibre pair / strand IDs, port group / cassette and polarity. Ordinary paths remain point-to-point; splitters require a dedicated continuity model."
            ]
          }
        ]
      },
      "fr": {
        "title": "Tracer un chemin physique complet",
        "intro": "Suivez les câbles réels et terminaisons passives jumelées d’une extrémité à l’autre.",
        "sections": [
          {
            "title": "Ouvrir et lire un tracé",
            "steps": [
              "Clic droit sur un port ou câble → Trace Physical Path, ou sélectionnez une extrémité puis Trace dans View. La fonction existe à tous les niveaux physiques.",
              "Lisez la liste ordonnée : extrémité, câble, continuité passive Front/Rear, câble suivant et extrémité finale. Vérifiez périphérique, port et lieu à chaque étape.",
              "Utilisez Open location pour rejoindre une extrémité enregistrée, y compris dans un autre plan. Déplacez, redimensionnez ou réduisez Trace tout en gardant Properties disponible.",
              "Si le chemin est ouvert, vérifiez la dernière terminaison reliée. Les continuités invalides, conflits et boucles sont signalés ; corrigez la connexion documentée puis relancez Trace."
            ]
          },
          {
            "note": "Connected signifie que la continuité physique documentée est complète. La supervision décrit les derniers états des interfaces ; Trace ne teste ni puissance optique, ni qualité du signal, ni transfert des paquets."
          },
          {
            "title": "Ports passifs et vérification",
            "body": [
              "Au survol d’un port passif, Front apparaît avant Rear. Chaque côté présente la terminaison directement reliée et l’équipement actif final, avec IP de gestion, supervision et emplacement. Un chemin incomplet affiche Unknown endpoint.",
              "Le placement MorMap fournit Site / Building / Floor / ServerRoom / Rack. En son absence, la localisation LibreNMS est affichée telle quelle, sans inventer de niveaux.",
              "Matched : LLDP / CDP correspond aux extrémités actives. Mismatch : une autre extrémité est découverte. Not Verified : chemin ou découverte incomplet. La découverte ne valide pas le câblage passif intermédiaire.",
              "Cable details conserve le nombre de fibres et ajoute paire / identifiants de brins, groupe de ports / cassette et polarité. Les chemins ordinaires restent point à point ; les splitters demandent un modèle de continuité dédié."
            ]
          }
        ]
      }
    },
    {
      "id": "save-documents",
      "scopes": [
        "logical",
        "physical"
      ],
      "group": "share",
      "tags": "",
      "related": [
        "publish",
        "port-troubleshooting",
        "physical-connections"
      ],
      "en": {
        "title": "Save, reload, rename and delete",
        "intro": "A saved draft, a published layout and shared infrastructure have different lifecycles.",
        "sections": [
          {
            "title": "Choose the intended action",
            "table": {
              "head": [
                "Command",
                "Effect"
              ],
              "rows": [
                [
                  "Save",
                  "Stores the editable map/plan and its shared device and connection changes."
                ],
                [
                  "Reload",
                  "Reads the stored document again. Save the current work first when you want to retain it."
                ],
                [
                  "Undo / Redo",
                  "Reverses or reapplies the last fifty actions in this workspace session, including deletion. Save retains history; reloading the page starts a new session."
                ],
                [
                  "Rename",
                  "Changes draft and published titles together; it does not publish draft layout changes."
                ],
                [
                  "Delete selection · trash",
                  "Removes selected items. Deleting a device or connection point preserves cables still drawn in another saved map. Explicitly deleting or disconnecting a cable removes that shared connection from all maps in the same topology when saved. Undo restores the cable; Save applies the restoration."
                ],
                [
                  "Delete map / Delete plan · document with X",
                  "Immediately removes the draft and its published copy. Undo restores both. Equipment, images and connections remain."
                ]
              ]
            }
          },
          {
            "note": "Deleting a plan removes its location references but does not free ports used by shared cables. Use Connections / Disconnect for an intended shared cable removal. Port groups and remote links have actions that save immediately."
          }
        ]
      },
      "fr": {
        "title": "Enregistrer, recharger, renommer et supprimer",
        "intro": "Le brouillon enregistré, la disposition publiée et l’infrastructure partagée ont des cycles différents.",
        "sections": [
          {
            "title": "Choisir l’action adaptée",
            "table": {
              "head": [
                "Commande",
                "Effet"
              ],
              "rows": [
                [
                  "Save",
                  "Enregistre la carte ou le plan modifiable et les changements partagés des équipements et connexions."
                ],
                [
                  "Reload",
                  "Relit le document enregistré. Enregistrez d’abord le travail actuel pour le conserver."
                ],
                [
                  "Undo / Redo",
                  "Annule ou rétablit les cinquante dernières actions de la session, y compris les suppressions. Save conserve l’historique ; recharger la page démarre une nouvelle session."
                ],
                [
                  "Rename",
                  "Modifie les titres du brouillon et de la publication ensemble, sans publier les changements de disposition."
                ],
                [
                  "Delete selection · corbeille",
                  "Retire les éléments sélectionnés. Supprimer un équipement ou un point conserve les câbles encore dessinés dans une autre carte enregistrée. Supprimer ou déconnecter explicitement un câble retire sa connexion partagée de toutes les cartes de la même topologie lors de l’enregistrement. Undo restaure le câble ; Save applique la restauration."
                ],
                [
                  "Delete map / Delete plan · document avec X",
                  "Supprime immédiatement le brouillon et sa publication. Undo restaure les deux. Les équipements, images et connexions restent présents."
                ]
              ]
            }
          },
          {
            "note": "Supprimer un plan retire ses références de localisation mais ne libère pas les ports utilisés par les câbles partagés. Utilisez Connections / Disconnect pour retirer un câble partagé. Certaines actions, notamment les groupes de ports et liaisons distantes, enregistrent immédiatement."
          }
        ]
      }
    },
    {
      "id": "publish",
      "scopes": [
        "logical",
        "physical"
      ],
      "group": "share",
      "tags": "",
      "related": [
        "save-documents",
        "export"
      ],
      "en": {
        "title": "Publish a view-only map",
        "intro": "Publish makes a saved layout available through the LibreNMS Maps menu.",
        "sections": [
          {
            "title": "Publish and update",
            "steps": [
              "Finish your changes and Save. Review the title, ports, cable routes and relevant locations.",
              "Choose Publish. Open the returned viewer link or the corresponding entry in the LibreNMS Maps menu.",
              "Check the published layout. Viewers can navigate, pan, inspect information, trace available physical paths and export; editing controls are unavailable.",
              "After changing the draft layout, Save and Publish again to update its published snapshot.",
              "To add it to a LibreNMS dashboard, choose Add Widget → MorMap. Open the widget settings, select the published Logical or Physical map, and Save. Custom Map is the separate LibreNMS map widget."
            ]
          },
          {
            "note": "Publication freezes the layout, not monitoring or shared cable connectivity. Viewer access follows the existing LibreNMS/plugin access rules; a viewer URL does not itself create public access."
          }
        ]
      },
      "fr": {
        "title": "Publier une carte en lecture seule",
        "intro": "Publish rend une disposition enregistrée accessible depuis le menu Maps de LibreNMS.",
        "sections": [
          {
            "title": "Publier et actualiser",
            "steps": [
              "Terminez les modifications puis Save. Vérifiez le titre, les ports, les tracés et les emplacements concernés.",
              "Choisissez Publish. Ouvrez le lien de consultation ou l’entrée correspondante du menu Maps de LibreNMS.",
              "Vérifiez la disposition publiée. Les lecteurs peuvent naviguer, déplacer la vue, consulter les informations, tracer les chemins physiques disponibles et exporter ; les commandes d’édition sont indisponibles.",
              "Après modification de la disposition du brouillon, utilisez Save puis Publish pour actualiser sa publication.",
              "Pour l’ajouter à un tableau de bord LibreNMS, choisissez Add Widget → MorMap. Ouvrez les paramètres du widget, sélectionnez la carte Logical ou Physical publiée, puis Save. Custom Map est le widget distinct des cartes natives LibreNMS."
            ]
          },
          {
            "note": "La publication fige la disposition, pas la supervision ni la connectivité partagée. L’accès suit les règles de LibreNMS et du plugin ; le lien ne rend pas à lui seul la carte publique."
          }
        ]
      }
    },
    {
      "id": "export",
      "scopes": [
        "logical",
        "physical"
      ],
      "group": "share",
      "tags": "",
      "related": [
        "publish",
        "asset-export"
      ],
      "en": {
        "title": "Print and export diagrams",
        "intro": "Use the output preview to choose the drawing area, paper and file format before exporting.",
        "sections": [
          {
            "title": "Prepare an output",
            "steps": [
              "Choose Print / Export. In Physical, choose Current location or All locations when available.",
              "Choose Page, All content, Current view or Window (coordinates). Check that the preview includes the equipment, floor image and labels you need.",
              "For Print/PDF, set paper size, orientation, margins and scale. Fit to one sheet keeps it together; tiling, overlap and cut marks help assemble larger drawings.",
              "Choose color or grayscale, grid, title/sheet number and comment appendix. Set image resolution for raster output.",
              "Select PDF, SVG, PNG, JPEG or MorMap JSON and Export, or choose Print for the browser print dialog."
            ]
          },
          {
            "title": "Which format?",
            "table": {
              "head": [
                "Format",
                "Best use"
              ],
              "rows": [
                [
                  "SVG / vector PDF",
                  "Sharp lines and text for sharing or printing."
                ],
                [
                  "PNG / JPEG",
                  "An image of the selected drawing area. Paper settings apply to Print/PDF."
                ],
                [
                  "MorMap JSON",
                  "A structured export. The map UI does not provide a general JSON restore workflow."
                ]
              ]
            }
          }
        ]
      },
      "fr": {
        "title": "Imprimer et exporter les schémas",
        "intro": "Utilisez l’aperçu pour choisir la zone du dessin, le papier et le format avant l’export.",
        "sections": [
          {
            "title": "Préparer une sortie",
            "steps": [
              "Choisissez Print / Export. Dans Physical, sélectionnez Current location ou All locations lorsque proposé.",
              "Choisissez Page, All content, Current view ou Window (coordinates). Vérifiez que l’aperçu contient les équipements, le fond d’étage et les libellés souhaités.",
              "Pour Print/PDF, réglez le papier, l’orientation, les marges et l’échelle. Fit to one sheet tient sur une feuille ; mosaïque, recouvrement et repères facilitent l’assemblage des grands plans.",
              "Choisissez couleur ou niveaux de gris, grille, titre/numéro de feuille et annexe des commentaires. Réglez la résolution pour les images.",
              "Sélectionnez PDF, SVG, PNG, JPEG ou MorMap JSON puis Export, ou Print pour la boîte d’impression du navigateur."
            ]
          },
          {
            "title": "Quel format choisir ?",
            "table": {
              "head": [
                "Format",
                "Usage"
              ],
              "rows": [
                [
                  "SVG / PDF vectoriel",
                  "Traits et textes nets pour le partage ou l’impression."
                ],
                [
                  "PNG / JPEG",
                  "Une image de la zone choisie. Les paramètres de papier concernent Print/PDF."
                ],
                [
                  "MorMap JSON",
                  "Un export structuré. L’interface des cartes ne propose pas de restauration générale depuis un JSON."
                ]
              ]
            }
          }
        ]
      }
    },
    {
      "id": "asset-replace",
      "scopes": [
        "library"
      ],
      "group": "manage",
      "tags": "",
      "related": [
        "asset-positions",
        "asset-export",
        "save-documents"
      ],
      "en": {
        "title": "Replace an image or delete an asset",
        "intro": "Use Replace everywhere when existing equipment must adopt another image while keeping its real port identities.",
        "sections": [
          {
            "title": "Replace across existing uses",
            "steps": [
              "Import or prepare the replacement image. Select the original asset and choose Replace everywhere.",
              "Read the affected uses: draft maps, published maps and shared equipment. Choose the replacement.",
              "Review every port position in the preview. Match a replacement template point or set the explicit position for each retained real port.",
              "Apply the replacement and reload other open maps to see it. Delete the original through the offered option only when that is the intended result."
            ]
          },
          {
            "title": "Delete asset versus Delete point",
            "body": [
              "Delete asset immediately removes an eligible unused library item. Undo restores its image and connection positions. An asset still in use is protected and requires replacement first. Delete point only removes the selected template position.",
              "Changing a template normally affects new placements. Replace everywhere is the explicit workflow that changes existing references, including published uses."
            ]
          }
        ]
      },
      "fr": {
        "title": "Remplacer une image ou supprimer un modèle",
        "intro": "Utilisez Replace everywhere pour changer l’image d’équipements existants en conservant leurs identités de ports.",
        "sections": [
          {
            "title": "Remplacer les utilisations existantes",
            "steps": [
              "Importez ou préparez l’image de remplacement. Sélectionnez le modèle d’origine puis Replace everywhere.",
              "Consultez les utilisations concernées : brouillons, publications et équipements partagés. Choisissez le remplacement.",
              "Vérifiez chaque position dans l’aperçu. Associez un point du nouveau modèle ou définissez une position précise pour chaque port réel conservé.",
              "Appliquez le remplacement et rechargez les autres cartes ouvertes. Utilisez l’option de suppression de l’original lorsque cela correspond au résultat souhaité."
            ]
          },
          {
            "title": "Delete asset et Delete point",
            "body": [
              "Delete asset supprime immédiatement un élément inutilisé éligible. Undo restaure son image et ses positions de connexion. Un modèle encore utilisé est protégé et doit d’abord être remplacé. Delete point retire seulement la position sélectionnée.",
              "Modifier un modèle concerne normalement les futurs placements. Replace everywhere est l’action explicite qui modifie les références existantes, y compris les publications."
            ]
          }
        ]
      }
    },
    {
      "id": "asset-export",
      "scopes": [
        "library"
      ],
      "group": "manage",
      "tags": "",
      "related": [
        "asset-import",
        "port-binding",
        "export"
      ],
      "en": {
        "title": "Export and reuse a stencil",
        "intro": "Share the image and its template positions as a portable MorMap package.",
        "sections": [
          {
            "title": "Move a template to another installation",
            "steps": [
              "Select the asset and Save pending name, point or appearance edits.",
              "Choose Export. The downloaded .json stencil package contains its image and saved connection positions.",
              "On another MorMap installation, open Asset Library → Import and select that package. Inspect it and save any adjustments.",
              "Place the image with Device in a map and bind its positions to the target installation’s own interfaces."
            ]
          },
          {
            "note": "A stencil package carries reusable artwork and positions. It does not transfer LibreNMS device inventory, credentials or real port bindings from another installation."
          }
        ]
      },
      "fr": {
        "title": "Exporter et réutiliser un modèle",
        "intro": "Partagez l’image et ses positions dans un paquet MorMap réutilisable.",
        "sections": [
          {
            "title": "Réutiliser sur une autre installation",
            "steps": [
              "Sélectionnez le modèle puis Save pour enregistrer nom, points et apparence en attente.",
              "Choisissez Export. Le paquet .json téléchargé contient l’image et les positions enregistrées.",
              "Sur une autre installation MorMap, ouvrez Asset Library → Import et choisissez le paquet. Vérifiez-le et enregistrez les ajustements.",
              "Placez l’image avec Device dans une carte et associez les positions aux interfaces de cette installation."
            ]
          },
          {
            "note": "Un paquet transporte le modèle et ses positions. Il ne transfère ni inventaire LibreNMS, ni identifiants d’accès, ni associations de ports réels d’une autre installation."
          }
        ]
      }
    },
    {
      "id": "port-troubleshooting",
      "scopes": [
        "logical",
        "physical"
      ],
      "group": "reference",
      "tags": "",
      "related": [
        "port-binding",
        "port-status",
        "format-painter",
        "select-pan"
      ],
      "en": {
        "title": "Resolve common map problems",
        "intro": "Start with the selected object, its exact port identity and the saved shared connection.",
        "sections": [
          {
            "title": "Symptom → next check",
            "table": {
              "head": [
                "Symptom",
                "What to check"
              ],
              "rows": [
                [
                  "No image positions are bound",
                  "Bind the image positions to real interfaces, then review Fill by interface order. A template label is not an interface binding."
                ],
                [
                  "Fill by interface order has nothing to assign",
                  "Check image position count, existing assignments, Stack member filter and Interface scope. Refresh the inventory when necessary."
                ],
                [
                  "Multiple connections on this port",
                  "This is a nonblocking advisory. The new and existing cables are retained. Inspect Connections or Trace, including off-page endpoints."
                ],
                [
                  "A NIC is missing",
                  "Compare the Ports inventory in LibreNMS with the host. Check discovery/SNMP exposure for physical NICs, bridges and bonds. MorMap uses that inventory."
                ],
                [
                  "Painter does not change the intended cable",
                  "Select a visible line as source, confirm the bottom message, then click a visible target line. Disable Automatic status color for fixed colors. Choose compatible targets for batch paste."
                ],
                [
                  "Shared-infrastructure conflict / another tab changed the map",
                  "Review the message and reload the latest stored state before reapplying the intended changes."
                ],
                [
                  "Pan appears to select instead",
                  "Use the Pan hand tool, or hold Alt while starting a left-drag on the canvas. See the point and text-field exceptions in Select, move, pan and zoom."
                ]
              ]
            }
          }
        ]
      },
      "fr": {
        "title": "Résoudre les problèmes courants",
        "intro": "Commencez par l’objet sélectionné, l’identité exacte de son port et la connexion partagée enregistrée.",
        "sections": [
          {
            "title": "Symptôme → vérification",
            "table": {
              "head": [
                "Symptôme",
                "Vérification"
              ],
              "rows": [
                [
                  "No image positions are bound",
                  "Associez les positions aux interfaces réelles, puis vérifiez Fill by interface order. Un libellé de modèle ne suffit pas."
                ],
                [
                  "Fill by interface order ne propose rien",
                  "Vérifiez le nombre de positions, les associations existantes, le membre Stack et Interface scope. Actualisez l’inventaire si nécessaire."
                ],
                [
                  "Multiple connections on this port",
                  "Cet avertissement ne bloque pas le travail. Le nouveau câble et les câbles existants sont conservés. Consultez Connections ou Trace, y compris les extrémités hors page."
                ],
                [
                  "Une carte réseau manque",
                  "Comparez Ports dans LibreNMS avec l’hôte. Vérifiez découverte/SNMP pour les interfaces physiques, bridges et bonds. MorMap utilise cet inventaire."
                ],
                [
                  "Le pinceau ne modifie pas le câble souhaité",
                  "Sélectionnez un trait visible comme source, vérifiez le message en bas puis cliquez sur la cible. Désactivez Automatic status color pour une couleur fixe. Choisissez des cibles compatibles pour le collage groupé."
                ],
                [
                  "Conflit d’infrastructure / carte modifiée dans un autre onglet",
                  "Consultez le message et rechargez l’état enregistré le plus récent avant de réappliquer les modifications souhaitées."
                ],
                [
                  "Pan semble sélectionner",
                  "Utilisez l’outil Pan ou maintenez Alt en commençant à glisser sur le fond. Consultez les exceptions des points et champs de texte dans le guide de navigation."
                ]
              ]
            }
          }
        ]
      }
    },
    {
      "id": "keyboard",
      "scopes": [
        "logical",
        "physical"
      ],
      "group": "reference",
      "tags": "",
      "related": [
        "select-pan",
        "cable-routing"
      ],
      "en": {
        "title": "Keyboard and gesture reference",
        "intro": "These shortcuts apply to Logical and Physical. Text fields keep normal text editing behavior.",
        "sections": [
          {
            "title": "Everyday shortcuts",
            "table": {
              "head": [
                "Key / gesture",
                "Action"
              ],
              "rows": [
                [
                  "F1",
                  "Open Help for the current workspace."
                ],
                [
                  "Ctrl/Cmd+S",
                  "Save."
                ],
                [
                  "Ctrl/Cmd+Z / Ctrl/Cmd+Shift+Z",
                  "Undo / Redo."
                ],
                [
                  "V / X / C",
                  "Select / connection point / cable."
                ],
                [
                  "Ctrl/Cmd+A / Delete",
                  "Select all / remove selection."
                ],
                [
                  "Ctrl/Cmd/Shift + click",
                  "Toggle an item in the selection."
                ],
                [
                  "Ctrl/Cmd+Shift+C / Ctrl/Cmd+Shift+V",
                  "Copy / paste formatting."
                ],
                [
                  "Alt + drag / Space + drag / middle-drag",
                  "Pan; use the hand tool as a key-free alternative."
                ],
                [
                  "Enter / Ctrl/Cmd+Enter in a comment",
                  "Apply the active form / apply a multiline comment."
                ],
                [
                  "Escape",
                  "Cancel the active tool or close the current window."
                ],
                [
                  "Physical rack handle: Alt+Up / Alt+Down",
                  "Reorder a rack among its siblings."
                ]
              ]
            }
          },
          {
            "title": "Inside Help",
            "body": [
              "Use Left/Right or Home/End on a workspace tab, then Tab to reach topics and article links. Search finds topics across all three guides in English and French. Escape closes Help; the close button returns focus to your work."
            ]
          }
        ]
      },
      "fr": {
        "title": "Raccourcis clavier et gestes",
        "intro": "Ces raccourcis concernent Logical et Physical. Les champs conservent le comportement normal de saisie.",
        "sections": [
          {
            "title": "Raccourcis courants",
            "table": {
              "head": [
                "Touche / geste",
                "Action"
              ],
              "rows": [
                [
                  "F1",
                  "Ouvrir l’aide de l’espace actuel."
                ],
                [
                  "Ctrl/Cmd+S",
                  "Enregistrer."
                ],
                [
                  "Ctrl/Cmd+Z / Ctrl/Cmd+Shift+Z",
                  "Annuler / Rétablir."
                ],
                [
                  "V / X / C",
                  "Sélection / point de connexion / câble."
                ],
                [
                  "Ctrl/Cmd+A / Delete",
                  "Tout sélectionner / supprimer la sélection."
                ],
                [
                  "Ctrl/Cmd/Shift + clic",
                  "Ajouter ou retirer un élément de la sélection."
                ],
                [
                  "Ctrl/Cmd+Shift+C / Ctrl/Cmd+Shift+V",
                  "Copier / coller la mise en forme."
                ],
                [
                  "Alt + glisser / Espace + glisser / bouton central",
                  "Déplacer la vue ; l’outil Pan fonctionne sans touche."
                ],
                [
                  "Enter / Ctrl/Cmd+Enter dans un commentaire",
                  "Valider le formulaire / valider un commentaire multiligne."
                ],
                [
                  "Escape",
                  "Annuler l’outil actif ou fermer la fenêtre actuelle."
                ],
                [
                  "Poignée de baie Physical : Alt+Haut / Alt+Bas",
                  "Déplacer une baie parmi les baies de la même salle."
                ]
              ]
            }
          },
          {
            "title": "Dans cette aide",
            "body": [
              "Utilisez Gauche/Droite ou Home/End sur un onglet, puis Tab pour atteindre les rubriques et liens. La recherche couvre les trois guides en anglais et français. Escape ferme l’aide ; le bouton de fermeture rend le focus à votre travail."
            ]
          }
        ]
      }
    },
    {
      "id": "asset-troubleshooting",
      "scopes": [
        "library"
      ],
      "group": "reference",
      "tags": "Unexpected token < is not valid JSON 413 upload import",
      "related": [
        "asset-import",
        "asset-positions",
        "asset-replace"
      ],
      "en": {
        "title": "Resolve import and template problems",
        "intro": "Check the asset file, its preview and the difference between template points and mapped interfaces.",
        "sections": [
          {
            "title": "Common issues",
            "table": {
              "head": [
                "Symptom",
                "Next step"
              ],
              "rows": [
                [
                  "Unexpected token < / HTML instead of JSON",
                  "The upload received an HTML page rather than the expected response. Check the browser Network response/status: file-size rejection, expired login, proxy or server error are possible causes. Review the corresponding server log."
                ],
                [
                  "The file is too large",
                  "Use image content within 5 MB or a package within 8 MB, then check any lower PHP/web-server limit."
                ],
                [
                  "Points are visible here but missing on a device",
                  "Save the stencil, choose the matching image and bind its positions with Device / Bind image ports."
                ],
                [
                  "An existing map did not change after Save",
                  "Existing placements keep their own points and appearance. Use the map’s editing tools or the explicit Replace everywhere workflow."
                ],
                [
                  "Delete asset is refused",
                  "Inspect its uses. Replace the image across the required uses before deleting the unused original."
                ],
                [
                  "Dragging adds a point instead of moving the preview",
                  "Choose Select or turn X off, then drag empty preview space."
                ]
              ]
            }
          }
        ]
      },
      "fr": {
        "title": "Résoudre les problèmes d’import et de modèles",
        "intro": "Vérifiez le fichier, son aperçu et la différence entre positions de modèle et interfaces associées.",
        "sections": [
          {
            "title": "Problèmes fréquents",
            "table": {
              "head": [
                "Symptôme",
                "Étape suivante"
              ],
              "rows": [
                [
                  "Unexpected token < / HTML au lieu de JSON",
                  "L’import reçoit une page HTML au lieu de la réponse attendue. Consultez réponse et statut dans Network : taille refusée, session expirée, proxy ou erreur serveur sont possibles. Vérifiez le journal correspondant."
                ],
                [
                  "Fichier trop volumineux",
                  "Utilisez une image de 5 Mo maximum ou un paquet de 8 Mo maximum, puis vérifiez les limites PHP/serveur inférieures."
                ],
                [
                  "Points présents ici mais absents sur un périphérique",
                  "Enregistrez le modèle, choisissez la bonne image et associez les positions avec Device / Bind image ports."
                ],
                [
                  "Une carte existante ne change pas après Save",
                  "Les placements existants conservent points et apparence. Utilisez les outils de la carte ou Replace everywhere."
                ],
                [
                  "Delete asset est refusé",
                  "Consultez les utilisations. Remplacez l’image dans les références concernées avant de supprimer l’original inutilisé."
                ],
                [
                  "Glisser ajoute un point au lieu de déplacer la vue",
                  "Choisissez Select ou désactivez X, puis glissez sur le fond de l’aperçu."
                ]
              ]
            }
          }
        ]
      }
    }
  ],
  "about": {
    "name": "Morteza VASARAKI",
    "linkedin": "https://www.linkedin.com/in/morteza-vasaraki-077984177",
    "github": "https://github.com/MoriVASARAKI",
    "en": {
      "title": "Built from real network needs.",
      "intro": "MorMap was conceived, designed and built by Morteza VASARAKI, starting with the day-to-day needs of network professionals.",
      "role": "Concept · Design · Development",
      "sections": [
        {
          "title": "Why MorMap exists",
          "body": [
            "The project began with a practical gap: bringing logical diagrams, physical locations, detailed cabling and reusable equipment images together inside LibreNMS. This combination is difficult to find in a single tool that follows how network teams actually work.",
            "MorMap aims to make infrastructure easier to document, understand and maintain, with precise port identities and the freedom to draw a clear, useful map."
          ]
        },
        {
          "title": "Help shape what comes next",
          "body": [
            "Ideas, constructive feedback and suggestions from real installations are welcome. Share them with Morteza on LinkedIn. Each practical observation can help improve the next version."
          ]
        }
      ],
      "linkedinLabel": "Share feedback on LinkedIn",
      "githubLabel": "Visit my GitHub profile",
      "footer": "An independent plugin for LibreNMS, built with network professionals in mind."
    },
    "fr": {
      "title": "Né des besoins réels du réseau.",
      "intro": "MorMap a été imaginé, conçu et développé par Morteza VASARAKI, à partir des besoins quotidiens des professionnels du réseau.",
      "role": "Idée · Conception · Développement",
      "sections": [
        {
          "title": "Pourquoi MorMap existe",
          "body": [
            "Le projet est né d’un besoin concret : réunir schémas logiques, emplacements physiques, câblage détaillé et images d’équipements réutilisables au sein de LibreNMS. Cette combinaison reste difficile à trouver dans un outil unique adapté aux habitudes de travail des équipes réseau.",
            "MorMap vise à rendre l’infrastructure plus simple à documenter, à comprendre et à maintenir, en associant une identification précise des ports à la liberté de dessiner une carte claire et utile."
          ]
        },
        {
          "title": "Vos retours font avancer le projet",
          "body": [
            "Les idées, retours constructifs et suggestions issus du terrain sont les bienvenus. Partagez-les avec Morteza sur LinkedIn. Chaque observation concrète peut contribuer à améliorer la prochaine version."
          ]
        }
      ],
      "linkedinLabel": "Partager un retour sur LinkedIn",
      "githubLabel": "Visiter mon profil GitHub",
      "footer": "Un plugin indépendant pour LibreNMS, pensé pour les professionnels du réseau."
    }
  }
};
if(typeof module==='object'&&module.exports)module.exports=data;else root.MorMapHelpContent=data;
})(typeof window!=='undefined'?window:globalThis);
