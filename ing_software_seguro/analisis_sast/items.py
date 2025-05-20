items = {
    "AGED_BRIE": "Aged Brie",
    "BACKSTAGE_PASSES_TAFKAL80ETC_CONCERT": "Backstage passes to a TAFKAL80ETC concert",
    "SULFURAS": "Sulfuras, Hand of Ragnaros",
}

class ItemUpdater:
    def __init__(self, item):
        self.item = item

    def update(self):
        raise NotImplementedError("This method should be overridden in subclasses")

class SulfurasUpdater(ItemUpdater):
    def update(self):
        # Sulfuras does not need to be updated
        pass

class AgedBrieUpdater(ItemUpdater):
    def update(self):
        if self.item.quality < 50:
            self.item.quality += 1
        self.item.sell_in -= 1
        if self.item.sell_in < 0 and self.item.quality < 50:
            self.item.quality += 1

class BackstagePassUpdater(ItemUpdater):
    def update(self):
        if self.item.quality < 50:
            self.item.quality += 1
            if self.item.sell_in < 11:
                self.item.quality = min(50, self.item.quality + 1)
            if self.item.sell_in < 6:
                self.item.quality = min(50, self.item.quality + 1)
        self.item.sell_in -= 1
        if self.item.sell_in < 0:
            self.item.quality = 0

class NormalItemUpdater(ItemUpdater):
    def update(self):
        if self.item.quality > 0:
            self.item.quality -= 1
        self.item.sell_in -= 1
        if self.item.sell_in < 0 < self.item.quality:
            self.item.quality -= 1

class ConjuredItemUpdater(ItemUpdater):
    def update(self):
        if self.item.quality > 0:
            degrade = 2
            if self.item.sell_in <= 0:
                degrade *= 2
            self.item.quality = max(0, self.item.quality - degrade)
        self.item.sell_in -= 1
