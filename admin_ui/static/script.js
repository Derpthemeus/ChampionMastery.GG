

const services = [
	{
		name: "Grafana",
		target: "grafana.",
		icon: "/logos/grafana.png"
	},
	{
		name: "Cloudflare",
		target: "https://www.cloudflare.com/",
		icon: "/logos/cloudflare.png"
	},
	{
		name: "Prometheus",
		target: "prometheus.",
		icon: "/logos/prometheus.png"
	},
	{
		name: "Traefik",
		target: "traefik.",
		icon: "/logos/traefik.png"
	},
	{
		name: "DigitalOcean",
		target: "https://cloud.digitalocean.com/",
		icon: "/logos/digitalocean.png"
	},
	{
		name: "AWS S3",
		target: "https://s3.console.aws.amazon.com/s3/home",
		icon: "/logos/aws_s3.png"
	}
];


window.addEventListener("load", () => {
	const root = document.getElementById("services");
	for (const service of services) {
		const serviceDiv = document.createElement("div");
		serviceDiv.className = "service";
		// If the target ends with a ".", prepend it to the current URL hostname.
		const target = service.target.endsWith(".")
			? "//" + service.target + window.location.hostname.match(/(www\.)?(.*)/)[2]
			: service.target;
		const link = document.createElement("a");
		link.href = target;
		serviceDiv.appendChild(link);

		const img = document.createElement("img");
		link.appendChild(img);
		img.className = "service-icon";
		img.src = service.icon;
		const label = document.createElement("span");
		label.className = "service-label";
		label.appendChild(document.createTextNode(service.name));
		link.appendChild(label);

		root.appendChild(serviceDiv);
	}
});
