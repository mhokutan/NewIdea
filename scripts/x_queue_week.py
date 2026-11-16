# X queue for 2026-11-17 to 2026-11-23: 10 plain posts a day, no links.
import sys
HOURS = [11, 12, 13, 14, 16, 17, 18, 20, 21, 23]
DAYS = {
"2026-11-17": [
 ("pv", "New week, new Today's Drop. Seven short promos, one call each. Will blow up or Not for me?"),
 ("q", "Indie devs: what was the first thing a stranger said about your game? #indiedev"),
 ("he", "Hauling Empire: night routes, border queues and a fleet that keeps growing. Search Hauling Empire on the App Store or Google Play."),
 ("dro", "Dropolis: build a city with robot workers, then launch a rocket to Mars. Search Dropolis on Google Play."),
 ("pv", "Your Scout Score only grows. A wrong call costs nothing, a right call moves you up."),
 ("pol", "Poleris: a few calm minutes to breathe, picture your day and rest. Search Poleris on the App Store or Google Play."),
 ("q", "This or that: one big update a month or small updates every week? #gamedev"),
 ("dov", "Dovelet is a small app for couples, made by the same solo founder behind Hauling Empire. Search Dovelet on Google Play."),
 ("ni", "Nicheable: printable and digital planners for people who like simple pages. Find Nicheable on Etsy."),
 ("pv", "PromoVote is free on iPhone and Android. Search PromoVote in your app store."),
],
"2026-11-18": [
 ("q", "Founders: what is one metric you check every single morning? #startup"),
 ("pv", "How Duel works: two promos play side by side. Pick the one you think blows up first. That is it."),
 ("he", "Hauling Empire: start with one truck and a small depot. Every delivery pays for the next step. Search Hauling Empire on Google Play."),
 ("dro", "Dropolis: robots build, you plan. Grow the city one block at a time. Search Dropolis on Google Play."),
 ("q", "Players: do you read patch notes, or just open the game and find out? #gaming"),
 ("pol", "Poleris: one intention in the morning, one check in at night. Search Poleris on the App Store."),
 ("pv", "Creators on PromoVote cannot vote. Only scouts make calls, so the crowd stays honest."),
 ("ni", "Nicheable's rental tax sheet keeps a host's income and costs on one page. Find Nicheable on Etsy."),
 ("q", "Makers: what did you cut from your first version that you never added back? #buildinpublic"),
 ("pv", "Today's Drop ends after 7 promos. A feed that finishes is a feature, not a bug."),
],
"2026-11-19": [
 ("pv", "Scouts call it early. Seven days later the crowd decides. Were you right?"),
 ("q", "Indie devs: how many people tested your game before launch? #indiedev"),
 ("he", "Hauling Empire is made by one developer and updated often from player feedback. Search Hauling Empire on the App Store."),
 ("dov", "Dovelet: a shared little space for two. Search Dovelet on Google Play."),
 ("q", "This or that: city builder or tycoon game? #mobilegames"),
 ("pol", "Poleris is built around a 21 day ritual. Small steps, every day. Search Poleris on Google Play."),
 ("dro", "Dropolis: finish the first chapter, then the sky is not the limit. Mars is. Search Dropolis on Google Play."),
 ("pv", "Follow a creator and their new promos land in your Following tab, newest first. No ranking."),
 ("q", "Founders: what is the hardest email you sent in your first year? #startup"),
 ("ni", "Nicheable: undated pages, so you start whenever you are ready. Find Nicheable on Etsy."),
],
"2026-11-20": [
 ("q", "Solo devs: what part of the work do you put off the longest? #indiedev"),
 ("pv", "A like is free. A call is a small bet on your taste. That is the PromoVote game."),
 ("he", "Hauling Empire: upgrade your depots and your trucks spend less time waiting. Search Hauling Empire on Google Play."),
 ("dro", "Dropolis: invite a friend with your code and both of you get a gift in game. Search Dropolis on Google Play."),
 ("pol", "Poleris: no streak shaming, just a calm daily practice. Search Poleris on the App Store."),
 ("q", "Players: what makes you delete a game in the first 5 minutes? #gaming"),
 ("pv", "Weekly streak on PromoVote: make calls on 3 different days in a week. Miss one? Up to 2 saved weeks cover you."),
 ("dov", "Made for couples who like small daily moments. Dovelet, search it on Google Play."),
 ("q", "Makers: launch on a Monday or a Friday? Why? #buildinpublic"),
 ("pv", "Friday Drop is live. Seven promos, about a minute. Which one is the next hit?"),
],
"2026-11-21": [
 ("q", "Creators: what is the shortest video that ever worked for you? #creators"),
 ("pv", "Duel is its own tab in the app. No start button, two videos play, you pick, the next one comes."),
 ("he", "Hauling Empire runs on iPhone, iPad and Android. One save, more routes every week. Search Hauling Empire in your app store."),
 ("dro", "Dropolis: city level, deliveries and colonists each have their own weekly board. Search Dropolis on Google Play."),
 ("ni", "Nicheable's grade tracker puts every class and grade on one sheet. Find Nicheable on Etsy."),
 ("q", "Indie devs: paid ads, organic posts or both for your first 100 players? #gamedev"),
 ("pol", "Poleris: breathe in, picture it, let it go. A short ritual for busy days. Search Poleris on Google Play."),
 ("pv", "Weekend plan: make 7 calls, come back in 7 days, see how your taste did."),
 ("dov", "Dovelet is free to try on Android. Search Dovelet on Google Play."),
 ("q", "Founders: what is a small win from this week? Share it. #buildinpublic"),
],
"2026-11-22": [
 ("pv", "Saturday Drop: seven promos from small makers. Your call decides nothing alone, the crowd decides together."),
 ("q", "Players: cozy game or competitive game for a Saturday? #gaming"),
 ("he", "Hauling Empire: plan the route, watch the clock, get paid on delivery. Search Hauling Empire on the App Store."),
 ("dro", "Dropolis: your robots never sleep, but your city still needs a plan. Search Dropolis on Google Play."),
 ("q", "Makers: what is one thing you learned from your first bad review? #indiedev"),
 ("pol", "Poleris: a quiet minute on a loud day. Search Poleris on the App Store."),
 ("pv", "Team picks on PromoVote are chosen by hand and never sold. Paying never buys a spot."),
 ("ni", "Nicheable: a focus planner with less clutter and more done. Find Nicheable on Etsy."),
 ("q", "This or that: trailer with gameplay only or with story? #gamedev"),
 ("pv", "Gifts on PromoVote come from creators and never ask for your calls or follows."),
],
"2026-11-23": [
 ("q", "Founders: what will you ship next week? One line. #buildinpublic"),
 ("pv", "Sunday Drop is ready. Seven promos, then you are done. Enjoy the rest of your day."),
 ("he", "Hauling Empire: from one truck to a company. Search Hauling Empire on Google Play."),
 ("dro", "Dropolis: build on Earth, then reach for Mars. Search Dropolis on Google Play."),
 ("dov", "Dovelet: small moments, shared. Search Dovelet on Google Play."),
 ("q", "Indie devs: how do you pick the first 3 seconds of a trailer? #indiedev"),
 ("pol", "Poleris: start the week with one clear intention. Search Poleris on Google Play."),
 ("pv", "This week on PromoVote: Duel, Today's Drop and your weekly streak. See you tomorrow."),
 ("ni", "Nicheable: digital downloads you can use right after you buy. Find Nicheable on Etsy."),
 ("q", "Creators: what is the one question your audience always asks? #creators"),
],
}
VIDEOS = [
 ("2026-11-18T15:00:00.000Z", "2026-11-18-1500-duel", "Night depot or a calm minute? Two promos, one call. Which one blows up first? Play Duel, link in our profile.", "https://promovote.com/media/x/nov3-duel-1.mp4"),
 ("2026-11-21T15:00:00.000Z", "2026-11-21-1500-duel", "Planner or tycoon? You have one tap. Which one blows up first? Play Duel, link in our profile.", "https://promovote.com/media/x/nov3-duel-2.mp4"),
]
q = lambda s: "'" + s.replace("'", "''") + "'"
out = []
for day, posts in DAYS.items():
    assert len(posts) == 10, day
    for h, (tag, body) in zip(HOURS, posts):
        assert len(body) <= 280 and "http" not in body and "www." not in body, body
        out.append(f"INSERT INTO social_posts (id, network, body, scheduled_at, status) VALUES ({q(f'{day}-{h:02d}00-{tag}')}, 'x', {q(body)}, '{day}T{h:02d}:00:00.000Z', 'queued');")
mode = sys.argv[1] if len(sys.argv) > 1 else "plain"
if mode == "video":
    out = [f"INSERT INTO social_posts (id, network, body, scheduled_at, status, media_url) VALUES ({q(i)}, 'x', {q(b)}, '{t}', 'queued', {q(m)});" for t, i, b, m in VIDEOS]
print("\n".join(out))
