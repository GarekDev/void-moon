"""Build entities/player.json from Bedrock 1.21.0 samples + Void Moon heart groups.

Vanilla player.json does not define minecraft:health (engine default 20).
Component groups replace that health pool in 2-HP (1 heart) steps.
"""
from __future__ import annotations

import json
from pathlib import Path

MAX_EXTRA = 18
BASE_HP = 20

VANILLA = {
    "format_version": "1.21.0",
    "minecraft:entity": {
        "description": {
            "identifier": "minecraft:player",
            "spawn_category": "creature",
            "is_spawnable": False,
            "is_summonable": False,
        },
        "component_groups": {
            "minecraft:add_raid_omen": {
                "minecraft:spell_effects": {
                    "add_effects": [
                        {
                            "effect": "raid_omen",
                            "duration": 30,
                            "display_on_screen_animation": True,
                        }
                    ],
                    "remove_effects": "bad_omen",
                },
                "minecraft:timer": {
                    "time": [0.0, 0.0],
                    "looping": False,
                    "time_down_event": {
                        "event": "minecraft:clear_add_raid_omen",
                        "target": "self",
                    },
                },
            },
            "minecraft:clear_raid_omen_spell_effect": {"minecraft:spell_effects": {}},
            "minecraft:raid_trigger": {
                "minecraft:raid_trigger": {
                    "triggered_event": {
                        "event": "minecraft:remove_raid_trigger",
                        "target": "self",
                    }
                }
            },
            "voidmoon:fast_drown": {
                "minecraft:breathable": {
                    "total_supply": 5,
                    "suffocate_time": -1,
                    "inhale_time": 3.75,
                    "generates_bubbles": False,
                }
            },
        },
        "components": {
            "minecraft:experience_reward": {
                "on_death": "Math.Min(query.player_level * 7, 100)"
            },
            "minecraft:type_family": {"family": ["player"]},
            "minecraft:is_hidden_when_invisible": {},
            "minecraft:loot": {"table": "loot_tables/empty.json"},
            "minecraft:collision_box": {"width": 0.6, "height": 1.8},
            "minecraft:can_climb": {},
            "minecraft:movement": {"value": 0.1},
            "minecraft:hurt_on_condition": {
                "damage_conditions": [
                    {
                        "filters": {
                            "test": "in_lava",
                            "subject": "self",
                            "operator": "==",
                            "value": True,
                        },
                        "cause": "lava",
                        "damage_per_tick": 4,
                    }
                ]
            },
            "minecraft:attack": {"damage": 1},
            "minecraft:exhaustion_values": {
                "heal": 6,
                "jump": 0.05,
                "sprint_jump": 0.2,
                "mine": 0.005,
                "attack": 0.1,
                "damage": 0.1,
                "walk": 0.0,
                "sprint": 0.1,
                "swim": 0.01,
            },
            "minecraft:player.saturation": {"value": 5, "max": 20},
            "minecraft:player.exhaustion": {"value": 0, "max": 20},
            "minecraft:player.level": {"value": 0, "max": 24791},
            "minecraft:player.experience": {"value": 0, "max": 1},
            "minecraft:breathable": {
                "total_supply": 15,
                "suffocate_time": -1,
                "inhale_time": 3.75,
                "generates_bubbles": False,
            },
            "minecraft:nameable": {
                "always_show": True,
                "allow_name_tag_renaming": False,
            },
            "minecraft:physics": {"push_towards_closest_space": True},
            "minecraft:pushable": {
                "is_pushable": False,
                "is_pushable_by_piston": True,
            },
            "minecraft:insomnia": {"days_until_insomnia": 3},
            "minecraft:rideable": {
                "seat_count": 2,
                "family_types": ["parrot_tame"],
                "pull_in_entities": True,
                "seats": [
                    {
                        "position": [0.4, -0.2, -0.1],
                        "min_rider_count": 0,
                        "max_rider_count": 0,
                        "lock_rider_rotation": 0,
                    },
                    {
                        "position": [-0.4, -0.2, -0.1],
                        "min_rider_count": 1,
                        "max_rider_count": 2,
                        "lock_rider_rotation": 0,
                    },
                ],
            },
            "minecraft:conditional_bandwidth_optimization": {},
            "minecraft:block_climber": {},
            "minecraft:environment_sensor": {
                "triggers": {
                    "filters": {
                        "all_of": [
                            {
                                "test": "has_mob_effect",
                                "subject": "self",
                                "value": "bad_omen",
                            },
                            {
                                "test": "is_in_village",
                                "subject": "self",
                                "value": True,
                            },
                        ]
                    },
                    "event": "minecraft:gain_raid_omen",
                }
            },
        },
        "events": {
            "minecraft:gain_raid_omen": {
                "add": {"component_groups": ["minecraft:add_raid_omen"]}
            },
            "minecraft:clear_add_raid_omen": {
                "remove": {"component_groups": ["minecraft:add_raid_omen"]},
                "add": {"component_groups": ["minecraft:clear_raid_omen_spell_effect"]},
            },
            "minecraft:trigger_raid": {
                "add": {"component_groups": ["minecraft:raid_trigger"]}
            },
            "minecraft:remove_raid_trigger": {
                "remove": {"component_groups": ["minecraft:raid_trigger"]}
            },
            "voidmoon:fast_drown": {
                "add": {"component_groups": ["voidmoon:fast_drown"]}
            },
        },
    },
}


def group_name(n: int) -> str:
    return f"voidmoon:life_{n}"


def curse_name(n: int) -> str:
    return f"voidmoon:curse_{n}"


def main() -> None:
    data = json.loads(json.dumps(VANILLA))
    groups = data["minecraft:entity"]["component_groups"]
    events = data["minecraft:entity"]["events"]
    all_groups = [group_name(i) for i in range(MAX_EXTRA + 1)] + [
        curse_name(i) for i in range(MAX_EXTRA + 1)
    ]

    for n in range(MAX_EXTRA + 1):
        hp = BASE_HP + n * 2
        groups[group_name(n)] = {"minecraft:health": {"value": hp, "max": hp}}
        events[group_name(n)] = {
            "remove": {"component_groups": list(all_groups)},
            "add": {"component_groups": [group_name(n)]},
        }
        cursed = max(2, hp // 2)
        groups[curse_name(n)] = {"minecraft:health": {"value": cursed, "max": cursed}}
        events[curse_name(n)] = {
            "remove": {"component_groups": list(all_groups)},
            "add": {"component_groups": [curse_name(n)]},
        }

    out = (
        Path(__file__).resolve().parents[1]
        / "behavior_pack"
        / "entities"
        / "player.json"
    )
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {out} groups={MAX_EXTRA + 1}")


if __name__ == "__main__":
    main()
