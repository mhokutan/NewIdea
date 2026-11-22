# X queue for 2026-11-24 to 2026-11-30: 10 plain posts a day, no links.
# Usage: python3 scripts/x_queue_week.py > week.sql (then apply to promovote-db, social_posts only).
import sys
HOURS = [11, 12, 13, 14, 16, 17, 18, 20, 21, 23]
DAYS = {
"2026-11-24": [
 ("pv", "Seven promos, seven calls, then the drop is done. Today's Drop does not scroll forever."),
 ("q", "Indie devs: what is the one feature players ask for that you keep saying no to? #indiedev"),
 ("he", "Hauling Empire 2.5.3 is out on the App Store: regular sea loads on the Turkey and Europe Ro-Ro lines. Search Hauling Empire."),
 ("pol", "Poleris: read your affirmation, give thanks, picture it. Two quiet minutes before the day starts. Search Poleris on the App Store or Google Play."),
 ("q", "Players: do you finish the tutorial or skip it every time? #gaming"),
 ("dro", "Dropolis: pack the order, the courier rides it to the door. Then you build the street they ride on. Search Dropolis on Google Play."),
 ("pv", "On PromoVote a wrong call costs nothing. A right call grows your Scout Score."),
 ("dov", "Dovelet 1.1 adds a question of the day that opens for both of you at once. Search Dovelet on the App Store."),
 ("q", "Founders: what did your first ten users have in common? #startup"),
 ("ni", "Nicheable makes simple planners: print them, or use them on an E-Ink tablet. Find Nicheable on Etsy."),
],
"2026-11-25": [
 ("q", "This or that: a game with a story, or a game that is all systems? #gamedev"),
 ("pv", "Duel is the fastest way to play PromoVote: two promos, one tap, next pair comes by itself."),
 ("he", "In Hauling Empire the map filter now shows landmarks, players and ports apart. Less clutter, faster planning. Search Hauling Empire on the App Store."),
 ("dro", "Dropolis: tap any building and its card shows what the next upgrade gives. Search Dropolis on Google Play."),
 ("q", "Makers: how long did your app sit in review the first time? #buildinpublic"),
 ("pol", "Poleris has seven calm days for New Year intentions. A small start before the big date. Search Poleris on the App Store or Google Play."),
 ("pv", "Creators post, scouts call. Creators on PromoVote cannot vote, not even on someone else."),
 ("dov", "Dovelet keeps a countdown to the next time you meet. Long distance feels shorter with a number. Search Dovelet on the App Store."),
 ("q", "Indie devs: one word that describes your launch week? #indiedev"),
 ("ni", "Nicheable's college grade tracker: every class and every grade on one page. Find Nicheable on Etsy."),
],
"2026-11-26": [
 ("pv", "Happy Thanksgiving from a tiny team. Today's Drop is still seven promos, so you can get back to the table."),
 ("q", "What are you thankful for in your project this year? One line is enough. #indiedev"),
 ("pol", "Gratitude is one of the three steps in Poleris every morning. Today feels like a good day to start. Search Poleris on the App Store or Google Play."),
 ("he", "Hauling Empire now tells you why you cannot buy a ship yet: tier, port or money. Search Hauling Empire on the App Store."),
 ("q", "Players: what game are you playing this long weekend? #gaming"),
 ("dov", "Dovelet: one touch and their phone buzzes. A small hello across any distance. Search Dovelet on the App Store or Google Play."),
 ("dro", "Dropolis: robots do the heavy work while you plan the next district. Search Dropolis on Google Play."),
 ("pv", "Saved a promo you liked? It waits in your saves, so you can find it after the drop."),
 ("q", "Founders: what is one thing you would tell yourself on day one? #startup"),
 ("ni", "Nicheable's rental tax tracker keeps a host's income and costs in one place for tax time. Find Nicheable on Etsy."),
],
"2026-11-27": [
 ("q", "This or that: Black Friday sale for your game, or no sale at all? #gamedev"),
 ("pv", "PromoVote is free for viewers. The promos are the content, and you decide which ones blow up."),
 ("he", "Hauling Empire: your Company page now shows how close you are to CEO mode. Search Hauling Empire on the App Store."),
 ("dro", "Dropolis: from cottages to skyscrapers, every street is one you drew. Search Dropolis on Google Play."),
 ("q", "Indie devs: do you answer every store review, or only the bad ones? #indiedev"),
 ("pol", "Poleris works from your home screen and lock screen with a widget. Your intention, one look away. Search Poleris on the App Store or Google Play."),
 ("pv", "Swipe left on a promo to see more from the same creator. Swiping never votes."),
 ("dov", "Dovelet 1.1 brings shared lists: one for to do, one for shopping, both on both phones. Search Dovelet on the App Store."),
 ("q", "Makers: what tool saved you the most time this year? #buildinpublic"),
 ("ni", "Nicheable planners are undated, so a missed week never wastes a page. Find Nicheable on Etsy."),
],
"2026-11-28": [
 ("pv", "Weekend plan: one Today's Drop, seven calls, then see who was right next week."),
 ("q", "Players: truck game, city builder or calm app. Which one gets your weekend? #mobilegames"),
 ("dro", "Dropolis: finish chapter one and a rocket waits at the edge of town. Search Dropolis on Google Play."),
 ("he", "Hauling Empire has no gems and no energy bars. You play as long as you want. Search Hauling Empire on the App Store or Google Play."),
 ("q", "Indie devs: what do you do on the weekend, build or rest? Honest answers only. #indiedev"),
 ("pol", "Poleris: write what you want once, then come back to it every day. Small and steady. Search Poleris on the App Store or Google Play."),
 ("pv", "Your weekly streak on PromoVote needs calls on just 3 different days. Miss a week and a saved week covers you."),
 ("dov", "Dovelet: you can give your heart flower a name. Small things, shared by two. Search Dovelet on the App Store."),
 ("q", "Founders: weekends off or weekends on? #startup"),
 ("ni", "Nicheable: printable planners for people who like plain, calm pages. Find Nicheable on Etsy."),
],
"2026-11-29": [
 ("q", "This or that: a game you play for 5 minutes, or one for 2 hours? #gaming"),
 ("pv", "Promos on PromoVote are short, 10 to 30 seconds. Long enough to decide, short enough to watch one more."),
 ("he", "Hauling Empire: book deck space on Ro-Ro ferries and move loads by sea. Search Hauling Empire on the App Store or Google Play."),
 ("dov", "Dovelet Memories shows your photos from this day in past years. Search Dovelet on the App Store."),
 ("q", "Indie devs: what is your smallest change that got the biggest reaction? #gamedev"),
 ("dro", "Dropolis: launch your first rocket, then start a colony on Mars. Search Dropolis on Google Play."),
 ("pv", "Follow a creator and their new promos show in Following, newest first. No ranking, no Boost."),
 ("pol", "Poleris is a 21 day ritual. Two minutes a day, three weeks, one habit. Search Poleris on the App Store or Google Play."),
 ("q", "Makers: do you post your numbers in public? Why or why not? #buildinpublic"),
 ("ni", "Nicheable: digital planners that work on E-Ink tablets. Write by hand, keep it all in one file. Find Nicheable on Etsy."),
],
"2026-11-30": [
 ("pv", "Last day of November. How many of your calls this month were right? Your Scout Score knows."),
 ("q", "Indie devs: what did you ship in November? Share it below. #indiedev"),
 ("he", "Hauling Empire 2.5.3 adds an arrival reminder that names the time your load lands. Search Hauling Empire on the App Store."),
 ("pol", "December is close. Poleris has seven calm days to set an intention before the New Year. Search Poleris on the App Store or Google Play."),
 ("q", "Players: what was your favorite mobile game this month? #mobilegames"),
 ("dro", "Dropolis: lighter couriers and drones keep the city smooth on older phones too. Search Dropolis on Google Play."),
 ("pv", "PromoVote is made by a solo founder who also makes Hauling Empire, Dropolis, Poleris and Dovelet. Founder promos are always labeled."),
 ("dov", "Dovelet has no location tracking. Only your city, and only if you both turn it on. Search Dovelet on the App Store or Google Play."),
 ("q", "Founders: one goal for December? Keep it small. #startup"),
 ("ni", "Nicheable: a simple page for every plan, from classes to rentals. Find Nicheable on Etsy."),
],
}
q = lambda s: "'" + s.replace("'", "''") + "'"
out = []
for day, posts in DAYS.items():
    assert len(posts) == 10, day
    for h, (tag, body) in zip(HOURS, posts):
        assert len(body) <= 280 and "http" not in body and "www." not in body and ".com" not in body, body
        out.append(f"INSERT INTO social_posts (id, network, body, scheduled_at, status) VALUES ({q(f'{day}-{h:02d}00-{tag}')}, 'x', {q(body)}, '{day}T{h:02d}:00:00.000Z', 'queued');")
print("\n".join(out))
