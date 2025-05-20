# -*- coding: utf-8 -*-

from items import AgedBrieUpdater, BackstagePassUpdater, ConjuredItemUpdater, NormalItemUpdater, SulfurasUpdater, items

class GildedRose(object):
    def __init__(self, items):
        self.items = items

    def update_quality(self):
        for item in self.items:
            updater = self._get_updater(item)
            updater.update()

    def _get_updater(self, item):
        if item.name == items["AGED_BRIE"]:
            return AgedBrieUpdater(item)
        elif item.name == items["BACKSTAGE_PASSES_TAFKAL80ETC_CONCERT"]:
            return BackstagePassUpdater(item)
        elif item.name == items["SULFURAS"]:
            return SulfurasUpdater(item)
        elif "Conjured" in item.name:
            return ConjuredItemUpdater(item)
        else:
            return NormalItemUpdater(item)

class Item:
    def __init__(self, name, sell_in, quality):
        self.name = name
        self.sell_in = sell_in
        self.quality = quality

    def __repr__(self):
        return "%s, %s, %s" % (self.name, self.sell_in, self.quality)

